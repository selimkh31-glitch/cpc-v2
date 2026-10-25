#!/usr/bin/env node
// Publie un résumé des tests en annotation GitHub (::notice / ::error), lisible via l'API checks.
// Usage : node scripts/ci/annotate.mjs <vitest|playwright|pgtap> <fichier>
import { readFileSync, existsSync } from "node:fs";

const [kind, file] = process.argv.slice(2);
const esc = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
const escProp = (s) => esc(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
const emit = (level, title, lines) => console.log(`::${level} title=${escProp(title)}::${esc(lines.join("\n"))}`);

if (!file || !existsSync(file)) {
  emit("error", `${kind} — rapport absent`, [`Fichier introuvable : ${file}`]);
  process.exit(1);
}

let rows = [];
if (kind === "vitest") {
  const r = JSON.parse(readFileSync(file, "utf8"));
  for (const f of r.testResults ?? [])
    for (const a of f.assertionResults ?? []) rows.push({ status: a.status === "passed" ? "passed" : a.status, title: `${a.ancestorTitles.join(" › ")} › ${a.title}` });
} else if (kind === "playwright") {
  const r = JSON.parse(readFileSync(file, "utf8"));
  const walk = (suite, path) => {
    for (const s of suite.suites ?? []) walk(s, [...path, s.title].filter(Boolean));
    for (const spec of suite.specs ?? [])
      for (const t of spec.tests ?? []) {
        const last = t.results?.[t.results.length - 1];
        const status = t.status === "skipped" ? "skipped" : last?.status === "passed" ? "passed" : t.status === "flaky" ? "flaky" : last?.status ?? "unknown";
        const notes = (t.annotations ?? []).concat(last?.annotations ?? []).map((a) => `    ↳ ${a.type}: ${a.description ?? ""}`);
        rows.push({ status, title: `[${t.projectName}] ${[...path, spec.title].join(" › ")}${notes.length ? "\n" + notes.join("\n") : ""}` });
      }
  };
  for (const s of r.suites ?? []) walk(s, []);
} else if (kind === "pgtap") {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*(not ok|ok)\s+\d+\s*-?\s*(.*)$/);
    if (m) rows.push({ status: m[1] === "ok" ? "passed" : "failed", title: m[2] });
  }
} else {
  emit("error", "annotate", [`Type inconnu : ${kind}`]);
  process.exit(1);
}

const count = (s) => rows.filter((r) => r.status === s).length;
const failed = rows.filter((r) => !["passed", "skipped", "flaky"].includes(r.status));
const summary = `${kind} — ${count("passed")} réussis, ${failed.length} échoués, ${count("skipped")} ignorés, ${count("flaky")} instables (total ${rows.length})`;
const icon = { passed: "✔", skipped: "⏭", flaky: "⚠" };
emit(failed.length ? "error" : "notice", summary, rows.map((r) => `${icon[r.status] ?? "✘"} ${r.title}`));
if (rows.length === 0) {
  emit("error", `${kind} — aucun test détecté`, ["Le rapport ne contient aucun test."]);
  process.exit(1);
}
