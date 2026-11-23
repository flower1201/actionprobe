import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { ENGINE_VERSION } from "../version.js";

export type Issue = {
  file: string;
  ruleId: string;
  message: string;
  severity: "error" | "warn";
};

export type ProbeResult = {
  schemaVersion: "1.0";
  engineVersion: string;
  cwd: string;
  files: number;
  issues: Issue[];
  artifacts: { json: string; markdown: string };
};

function listWorkflows(cwd: string): string[] {
  const dir = path.join(cwd, ".github", "workflows");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.ya?ml$/i.test(f))
    .map((f) => path.join(dir, f));
}

export function probeActions(cwd: string, outDir: string): ProbeResult {
  const issues: Issue[] = [];
  const files = listWorkflows(cwd);

  for (const abs of files) {
    const rel = path.relative(cwd, abs).split(path.sep).join("/");
    const raw = fs.readFileSync(abs, "utf8");
    let doc: any;
    try {
      doc = parseYaml(raw);
    } catch (e) {
      issues.push({
        file: rel,
        ruleId: "YAML_PARSE",
        message: e instanceof Error ? e.message : String(e),
        severity: "error",
      });
      continue;
    }
    if (!doc || typeof doc !== "object") {
      issues.push({ file: rel, ruleId: "EMPTY_DOC", message: "workflow is empty", severity: "error" });
      continue;
    }
    if (!doc.on && !doc.true) {
      // yaml may parse `on` as boolean true
      issues.push({ file: rel, ruleId: "MISSING_ON", message: "missing `on` trigger", severity: "error" });
    }
    if (!doc.jobs || typeof doc.jobs !== "object") {
      issues.push({ file: rel, ruleId: "MISSING_JOBS", message: "missing `jobs`", severity: "error" });
      continue;
    }
    for (const [jobId, job] of Object.entries(doc.jobs as Record<string, any>)) {
      if (!job || typeof job !== "object") continue;
      if (!job["runs-on"] && !job.uses) {
        issues.push({
          file: rel,
          ruleId: "MISSING_RUNS_ON",
          message: `job '${jobId}' missing runs-on`,
          severity: "error",
        });
      }
      const steps = Array.isArray(job.steps) ? job.steps : [];
      if (!job.uses && steps.length === 0) {
        issues.push({
          file: rel,
          ruleId: "EMPTY_STEPS",
          message: `job '${jobId}' has no steps`,
          severity: "error",
        });
      }
      for (const step of steps) {
        if (!step || typeof step !== "object") continue;
        if (typeof step.uses === "string") {
          if (/@main$|@master$/i.test(step.uses)) {
            issues.push({
              file: rel,
              ruleId: "UNPINNED_ACTION",
              message: `uses floating ref: ${step.uses}`,
              severity: "warn",
            });
          }
          if (!/@/.test(step.uses)) {
            issues.push({
              file: rel,
              ruleId: "UNVERSIONED_ACTION",
              message: `uses missing version: ${step.uses}`,
              severity: "error",
            });
          }
        }
        if (typeof step.run === "string") {
          if (/curl[^\n]*\|\s*(ba)?sh/i.test(step.run)) {
            issues.push({
              file: rel,
              ruleId: "CURL_PIPE_SHELL",
              message: `job '${jobId}' pipes remote script to shell`,
              severity: "warn",
            });
          }
          if (/echo\s+[\"'].*secrets\./i.test(step.run) || /echo\s+\$\{\{\s*secrets\./i.test(step.run)) {
            issues.push({
              file: rel,
              ruleId: "ECHO_SECRET",
              message: `job '${jobId}' may echo secrets`,
              severity: "error",
            });
          }
        }
      }
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const result: ProbeResult = {
    schemaVersion: "1.0",
    engineVersion: ENGINE_VERSION,
    cwd,
    files: files.length,
    issues,
    artifacts: { json: "report.json", markdown: "summary.md" },
  };
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(result, null, 2));
  fs.writeFileSync(
    path.join(outDir, "summary.md"),
    [
      "# ActionProbe report",
      "",
      `Workflows: ${files.length} · Issues: ${issues.length}`,
      "",
      ...issues.map((i) => `- **${i.severity}** \`${i.ruleId}\` \`${i.file}\` — ${i.message}`),
    ].join("\n"),
  );
  return result;
}
