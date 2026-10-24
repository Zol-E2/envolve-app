// Checks that messages/hu.json and messages/en.json have the same keys and
// the same {placeholders}, so a text added in one language is not missing in
// the other. Run with: npm run check:i18n (also part of npm run lint).
import { readFileSync } from "node:fs";

const load = (lang) =>
  JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), "utf8"));

const flatten = (object, prefix = "") =>
  Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)]]
  );

// Top-level ICU arguments: "{count}", "{count, plural, ...}" -> "count"
const placeholders = (text) => {
  const names = new Set();
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) {
        const match = /^\{\s*([A-Za-z0-9_]+)/.exec(text.slice(i));
        if (match) names.add(match[1]);
      }
      depth++;
    } else if (text[i] === "}") {
      depth--;
    }
  }
  return [...names].sort().join(",");
};

const hu = new Map(flatten(load("hu")));
const en = new Map(flatten(load("en")));
const problems = [];

for (const key of hu.keys()) if (!en.has(key)) problems.push(`missing in en.json: ${key}`);
for (const key of en.keys()) if (!hu.has(key)) problems.push(`missing in hu.json: ${key}`);
for (const [key, text] of hu) {
  if (en.has(key) && placeholders(text) !== placeholders(en.get(key))) {
    problems.push(`different placeholders in ${key}: hu {${placeholders(text)}} / en {${placeholders(en.get(key))}}`);
  }
}

if (problems.length > 0) {
  console.error(`Translation check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Translations OK: ${hu.size} texts in both hu.json and en.json`);
