const fs = require("fs");
const path = require("path");

const required = [
  "server/index.js",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "extension/manifest.json",
  "extension/background.js",
  "extension/popup.html",
  "extension/popup.js"
];

for (const file of required) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${file}`);
  }
}

JSON.parse(fs.readFileSync(path.join(process.cwd(), "extension/manifest.json"), "utf8"));
console.log("Smoke test passed.");
