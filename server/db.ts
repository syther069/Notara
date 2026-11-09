// Storage: each record is a JSON document by id.
//  - On Vercel (DATABASE_URL set): Neon Postgres through Neon's serverless driver.
//  - Locally: Node's built-in SQLite file (data/notara.db), no setup needed.
// Every write is one atomic statement, never read-modify-write, because on Vercel several copies of
// the server run at once: `merge` patches fields in place, `insert` refuses a taken id, and `setOnce`
// sets a flag only if it isn't set yet (the send-link money rules rely on that).

import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../passport/src/config.ts";

type Table = "invoices" | "merchants" | "vaults";
type Row = { doc: any };
interface Engine {
  q(sql: string, params: unknown[]): Promise<Row[]>;
  /** Number of rows an update/insert changed. */
  run(sql: string, params: unknown[]): Promise<number>;
  pg: boolean;
}

let engine: Promise<Engine> | undefined;
const getEngine = () => (engine ??= process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL) : sqlite());

async function postgres(url: string): Promise<Engine> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  for (const t of ["invoices", "merchants", "vaults"]) await sql.query(`create table if not exists ${t} (id text primary key, created_at text not null, doc jsonb not null)`);
  return {
    pg: true,
    q: async (s, p) => (await sql.query(s, p)) as Row[],
    run: async (s, p) => ((await sql.query(`${s} returning id`, p)) as unknown[]).length,
  };
}

async function sqlite(): Promise<Engine> {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = process.env.NOTARA_DATA_DIR ?? join(ROOT, "data");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, "notara.db"));
  for (const t of ["invoices", "merchants", "vaults"]) db.exec(`create table if not exists ${t} (id text primary key, created_at text not null, doc text not null)`);
  migrate(db, dir);
  return {
    pg: false,
    q: async (s, p) => (db.prepare(s).all(...(p as any[])) as { doc: string }[]).map((r) => ({ doc: JSON.parse(r.doc) })),
    run: async (s, p) => Number(db.prepare(s).run(...(p as any[])).changes),
  };
}

/** One-time import of the old JSON files, kept as *.imported afterwards (local SQLite only). */
function migrate(db: any, dir: string) {
  const imports: [Table, string, (x: any) => [string, string, any][]][] = [
    ["invoices", "invoices.json", (list: any[]) => list.map((i) => [i.id, i.createdAt, i])],
    ["merchants", "merchants.json", (all: Record<string, any>) => Object.values(all).map((m) => [m.account, m.websiteCheckedAt ?? new Date().toISOString(), m])],
  ];
  for (const [table, file, rowsOf] of imports) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    if (db.prepare(`select count(*) as n from ${table}`).get().n === 0) {
      const ins = db.prepare(`insert into ${table} (id, created_at, doc) values (?, ?, ?)`);
      db.exec("begin");
      for (const [id, at, doc] of rowsOf(JSON.parse(readFileSync(path, "utf8")))) ins.run(id, at, JSON.stringify(doc));
      db.exec("commit");
    }
    renameSync(path, `${path}.imported`);
  }
}

/** A table of JSON documents keyed by id. Field names passed to setOnce/unset come from our code, never from users. */
export function docs<T>(table: Table) {
  // Placeholders: $1.. for Postgres, ? for SQLite.
  const ph = (e: Engine, n: number) => (e.pg ? `$${n}` : "?");
  return {
    async get(id: string): Promise<T | undefined> {
      const e = await getEngine();
      return (await e.q(`select doc from ${table} where id = ${ph(e, 1)}`, [id]))[0]?.doc;
    },
    async all(): Promise<T[]> {
      const e = await getEngine();
      return (await e.q(`select doc from ${table} order by created_at desc`, [])).map((r) => r.doc);
    },
    async count(): Promise<number> {
      const e = await getEngine();
      return Number((await e.q(`select count(*) as doc from ${table}`, []))[0]?.doc ?? 0);
    },
    /** Inserts a new document; false if the id is taken. */
    async insert(id: string, createdAt: string, doc: T): Promise<boolean> {
      const e = await getEngine();
      return (await e.run(`insert into ${table} (id, created_at, doc) values (${ph(e, 1)}, ${ph(e, 2)}, ${ph(e, 3)}) on conflict (id) do nothing`, [id, createdAt, JSON.stringify(doc)])) > 0;
    },
    /** Inserts or replaces a whole document. */
    async put(id: string, createdAt: string, doc: T): Promise<void> {
      const e = await getEngine();
      await e.run(`insert into ${table} (id, created_at, doc) values (${ph(e, 1)}, ${ph(e, 2)}, ${ph(e, 3)}) on conflict (id) do update set doc = excluded.doc`, [id, createdAt, JSON.stringify(doc)]);
    },
    /** Sets the given top-level fields in place (one statement, so concurrent writers don't undo each other). */
    async merge(id: string, patch: Partial<T>): Promise<T | undefined> {
      const e = await getEngine();
      const p = JSON.stringify(patch);
      if (e.pg) return (await e.q(`update ${table} set doc = doc || $2::jsonb where id = $1 returning doc`, [id, p]))[0]?.doc;
      await e.run(`update ${table} set doc = json_patch(doc, ?) where id = ?`, [p, id]);
      return this.get(id);
    },
    /** Sets doc[field] = value only if it isn't set yet. True if this call set it. */
    async setOnce(id: string, field: string, value: string): Promise<boolean> {
      const e = await getEngine();
      return e.pg
        ? (await e.run(`update ${table} set doc = jsonb_set(doc, $2, to_jsonb($3::text)) where id = $1 and not (doc ? $4)`, [id, `{${field}}`, value, field])) > 0
        : (await e.run(`update ${table} set doc = json_set(doc, ?, ?) where id = ? and json_extract(doc, ?) is null`, [`$.${field}`, value, id, `$.${field}`])) > 0;
    },
    /** Removes a field, e.g. to undo a setOnce whose follow-up failed. */
    async unset(id: string, field: string): Promise<void> {
      const e = await getEngine();
      if (e.pg) await e.run(`update ${table} set doc = doc - $2 where id = $1`, [id, field]);
      else await e.run(`update ${table} set doc = json_remove(doc, ?) where id = ?`, [`$.${field}`, id]);
    },
  };
}
