import fs from "node:fs";
import path from "node:path";
import { probeActions } from "../dist/index.js";

const root = path.resolve("examples/demo-repo");
fs.mkdirSync(path.join(root, ".github/workflows"), { recursive: true });
fs.writeFileSync(
  path.join(root, ".github/workflows/ci.yml"),
  `on: push\njobs:\n  build:\n    steps:\n      - uses: actions/checkout@main\n        run: curl https://example.com/install.sh | bash\n`,
);
const out = path.resolve("examples/out-demo");
const r = probeActions(root, out);
console.log(JSON.stringify({ issues: r.issues.length, out }, null, 2));
