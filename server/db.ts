// Storage: Node's built-in SQLite (no extra dependency). Each record is a JSON document by id,
// so a write touches one row instead of rewriting a whole file, and concurrent requests can't
// overwrite each other's changes.

import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ROOT } from "../passport/src/config.ts";

let conn: DatabaseSync | undefined;

function open(): DatabaseSync {
  if (conn) return conn;
  const dir = process.env.NOTARA_DATA_DIR ?? join(ROOT, "data");
  mkdirSync(dir, { recursive: true });
  conn = new DatabaseSync(join(dir, "notara.db"));
  conn.exec(`
    create table if not exists invoices (id text primary key, created_at text not null, doc text not null);
    create table if not exists merchants (id text primary key, created_at text not null, doc text not null);
  `);
  migrate(conn, dir);
  return conn;
}

/** One-time import of the old JSON files, kept as *.imported afterwards. */
function migrate(db: DatabaseSync, dir: string) {
  const imports: [string, string, (x: any) => [string, string, any][]][] = [
    ["invoices", "invoices.json", (list: any[]) => list.map((i) => [i.id, i.createdAt, i])],
    ["merchants", "merchants.json", (all: Record<string, any>) => Object.values(all).map((m) => [m.account, m.websiteCheckedAt ?? new Date().toISOString(), m])],
  ];
  for (const [table, file, rowsOf] of imports) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const empty = (db.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n === 0;
    if (empty) {
      const ins = db.prepare(`insert into ${table} (id, created_at, doc) values (?, ?, ?)`);
      db.exec("begin");
      for (const [id, at, doc] of rowsOf(JSON.parse(readFileSync(path, "utf8")))) ins.run(id, at, JSON.stringify(doc));
      db.exec("commit");
    }
    renameSync(path, `${path}.imported`);
  }
}

/** A table of JSON documents keyed by id. */
export function docs<T>(table: "invoices" | "merchants") {
  return {
    get: (id: string): T | undefined => {
      const r = open().prepare(`select doc from ${table} where id = ?`).get(id) as { doc: string } | undefined;
      return r ? JSON.parse(r.doc) : undefined;
    },
    all: (): T[] => (open().prepare(`select doc from ${table} order by created_at desc`).all() as { doc: string }[]).map((r) => JSON.parse(r.doc)),
    count: (): number => (open().prepare(`select count(*) as n from ${table}`).get() as { n: number }).n,
    put: (id: string, createdAt: string, doc: T) => {
      open().prepare(`insert into ${table} (id, created_at, doc) values (?, ?, ?) on conflict(id) do update set doc = excluded.doc`).run(id, createdAt, JSON.stringify(doc));
    },
  };
}
