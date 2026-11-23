#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { probeActions } from "../core/probe.js";
import { ENGINE_VERSION } from "../version.js";

const program = new Command();
program
  .name("actionprobe")
  .description("Offline lint for AI-generated GitHub Actions workflows")
  .version(ENGINE_VERSION)
  .argument("[dir]", "repo root", ".")
  .option("--out <dir>", "output directory", "./actionprobe-report")
  .option("--fail", "exit 10 on error-severity issues", false)
  .action((dir: string, opts: { out: string; fail?: boolean }) => {
    const result = probeActions(path.resolve(dir), path.resolve(opts.out));
    const errors = result.issues.filter((i) => i.severity === "error").length;
    process.stdout.write(
      `${JSON.stringify({ files: result.files, issues: result.issues.length, errors, out: opts.out }, null, 2)}\n`,
    );
    if (opts.fail && errors > 0) process.exitCode = 10;
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
