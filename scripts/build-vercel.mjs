// Builds Notara for Vercel with the Build Output API (https://vercel.com/docs/build-output-api):
//   .vercel/output/static            the website (web/dist)
//   .vercel/output/functions/api.func  the whole backend, bundled into one file, serving /api/* and /v1/*
// Vercel runs this as the project's build command (vercel.json). Locally: `node scripts/build-vercel.mjs`.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = ".vercel/output";
const fn = join(out, "functions", "api.func");
rmSync(out, { recursive: true, force: true });

execSync("npm run build", { stdio: "inherit", cwd: "web" });
cpSync("web/dist", join(out, "static"), { recursive: true });

await build({
  entryPoints: ["server/vercel.ts"],
  outfile: join(fn, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  // Some dependencies are CommonJS and call require(); give the ESM bundle one.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "warning",
});

// Files the backend reads at runtime, relative to NOTARA_ROOT (the function's own folder). Never keys/.
for (const f of ["passport/policy.json", "deployment.testnet.json", "deployment.mainnet.json", "demo/inbox"])
  if (existsSync(f)) {
    mkdirSync(join(fn, f, ".."), { recursive: true });
    cpSync(f, join(fn, f), { recursive: true }); // demo/inbox: the invoices the public agent reads
  }

writeFileSync(
  join(fn, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      maxDuration: 60, // a claim waits for a final NEAR transaction, sometimes two
      // Public mode: owner, demo and agent-pay routes are off and nothing is signed with a local key.
      environment: { NOTARA_PUBLIC: "1", NOTARA_ROOT: ".", NOTARA_DATA_DIR: "/tmp/notara" },
    },
    null,
    2,
  ),
);

writeFileSync(
  join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Security headers on every response. This project deploys with the Build Output API, so they live
        // here (a `headers` block in vercel.json is not read for prebuilt output).
        // The CSP limits what it safely can: no plugins, no <base> tricks, no form posts elsewhere, and no
        // framing by other sites. Scripts and connections stay open because NEAR wallets load their own
        // sandboxed code and talk to their own servers, which Notara can't list in advance.
        {
          src: "/(.*)",
          headers: {
            "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
            "Content-Security-Policy": "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
            "X-Content-Type-Options": "nosniff",
          },
          continue: true,
        },
        { handle: "filesystem" }, // real files first: assets, embed.js, llms.txt
        { src: "^/(api|v1)/(.*)$", dest: "/api" },
        { src: "^/(.*)$", dest: "/index.html" }, // client-side routes like /pay/INV-0001
      ],
    },
    null,
    2,
  ),
);
console.log("Built .vercel/output (static site + api function)");
