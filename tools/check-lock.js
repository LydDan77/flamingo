// Verifies that the files locked with Collection One are byte-for-byte unchanged.
//   node tools/check-lock.js            exit 1 and list any locked file whose content hash differs
//   node tools/check-lock.js --update   re-record the hashes (only when a change to a locked file was approved)
// The lock lives in docs/collection-one.lock.json. Collection Two work adds new files and new theme parts; it does not
// edit these. If a shared file genuinely has to change (a bug fix, say), re-run the Collection One QA, then --update.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = path.join(__dirname, "..");
const lockFile = path.join(root, "docs", "collection-one.lock.json");
const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
const sha1 = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(root, f))).digest("hex");
if (process.argv.includes("--update")) {
  for (const f of Object.keys(lock.files)) lock.files[f] = sha1(f);
  lock.commit = require("child_process").execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
  console.log("lock updated at", lock.commit.slice(0, 7));
  process.exit(0);
}
const changed = Object.entries(lock.files).filter(([f, h]) => !fs.existsSync(path.join(root, f)) || sha1(f) !== h);
if (changed.length) {
  console.error("Collection One lock: " + changed.length + " locked file(s) changed since " + lock.tag + ":");
  changed.forEach(([f]) => console.error("  " + f));
  console.error("Compare with: git diff " + lock.tag + " -- <file>. If the change is intended, run the Collection One QA and then: node tools/check-lock.js --update");
  process.exit(1);
}
console.log("Collection One lock intact (" + Object.keys(lock.files).length + " files, " + lock.tag + ")");
