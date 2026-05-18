const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "node_modules", "sql.js", "dist");
const outDir = path.join(root, "public");

const files = ["sql-wasm.wasm", "sql-wasm-browser.wasm"];

for (const name of files) {
  const from = path.join(dist, name);
  const to = path.join(outDir, name);
  if (!fs.existsSync(from)) {
    console.error(`copy-sql-wasm: missing ${from} (run npm install first)`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
}
