import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { probeActions } from "../src/core/probe.js";

describe("probeActions", () => {
  it("flags missing runs-on and unpinned actions", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "actionprobe-"));
    const wf = path.join(cwd, ".github", "workflows");
    fs.mkdirSync(wf, { recursive: true });
    fs.writeFileSync(
      path.join(wf, "ci.yml"),
      `on: push\njobs:\n  build:\n    steps:\n      - uses: actions/checkout@main\n`,
    );
    const result = probeActions(cwd, path.join(cwd, "out"));
    expect(result.issues.some((i) => i.ruleId === "MISSING_RUNS_ON")).toBe(true);
    expect(result.issues.some((i) => i.ruleId === "UNPINNED_ACTION")).toBe(true);
  });
});
