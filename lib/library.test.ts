import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { CATALOG } from "./catalog.ts";
import { GUIDE_COUNT, SECTIONS } from "./guides.ts";

test("every guide file is shown once, under a unique id", () => {
  const onDisk = readdirSync("docs/guides-ar")
    .filter((f) => f.endsWith(".json"))
    .flatMap(
      (f) => JSON.parse(readFileSync(`docs/guides-ar/${f}`, "utf8")).guides,
    );
  const ids = SECTIONS.flatMap((s) => s.guides.map((g) => g.id));
  // A new file in docs/guides-ar must be given a section in lib/guides.ts.
  assert.equal(GUIDE_COUNT, onDisk.length);
  assert.equal(new Set(ids).size, ids.length);
});

test("catalog slugs are unique and every drawing exists", () => {
  const slugs = CATALOG.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const p of CATALOG)
    if (p.image) assert.ok(existsSync(`public${p.image}`), p.image);
  assert.equal(CATALOG.filter((p) => p.image).length, 407);
});
