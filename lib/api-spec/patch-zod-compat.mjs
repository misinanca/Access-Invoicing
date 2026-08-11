import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const target = path.join(root, "lib", "api-zod", "src", "generated", "api.ts");
const text = readFileSync(target, "utf8");

const old = `import * as zod from 'zod';


`;
const next = `import * as zodImport from 'zod';

// Orval emits zod.int(), while this workspace runs Zod 3.
const zod = {
  ...zodImport,
  int: () => zodImport.number().int(),
};


`;

if (!text.includes(old)) {
  if (text.includes("int: () => zodImport.number().int()")) {
    console.log("zod.int shim already present");
    process.exit(0);
  }
  console.error("Could not locate Orval zod import to patch");
  process.exit(1);
}

writeFileSync(target, text.replace(old, next, 1));
console.log("Applied zod.int compatibility shim");
