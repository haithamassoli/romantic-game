import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticle, sources } from "./build-guides.mjs";

test("extracts article content without navigation and decodes entities", () => {
  const html = `<main><nav><p>Menu</p></nav><h1>Couples &amp; care</h1>
    <p class="intro">Start &quot;here&quot;.</p><article><h2>Talk</h2>
    <p>Ask each other.</p><ul><li>Listen &#38; pause.</li></ul>
    <aside><p>Advertisement</p></aside></article></main>`;

  assert.deepEqual(extractArticle(html, "nhs"), {
    title: "Couples & care",
    text: 'Start "here".\nTalk\nAsk each other.\nListen & pause.',
  });
});

test("focuses a long article on the relevant section", () => {
  const html = `<article><h1>Communication</h1><div class="mt-content-container">
    <h2>Unrelated</h2><p>Old news.</p>
    <h2>Healthy Communication about Sexuality</h2>
    <p>Ask about each other&rsquo;s needs.</p></div></article>`;

  assert.deepEqual(
    extractArticle(html, "libretexts", "Healthy Communication about Sexuality"),
    {
      title: "Communication",
      text: "Healthy Communication about Sexuality\nAsk about each other’s needs.",
    },
  );
});

test("limits MedlinePlus extraction to its public-domain Summary", () => {
  const html = `<main><h1>Birth Control</h1><nav><a>Summary</a></nav>
    <h2 id="summary">Summary</h2><p>Methods help prevent pregnancy.</p>
    <h3>Choosing a method</h3><p>Discuss your needs.</p>
    <h2 id="start-here">Start Here</h2><p>Licensed third-party article.</p></main>`;

  assert.deepEqual(extractArticle(html, "medline"), {
    title: "Birth Control",
    text: "Methods help prevent pregnancy.\nChoosing a method\nDiscuss your needs.",
  });
});

test("every configured source has one Arabic guide with matching rights", async () => {
  const guides = (
    await Promise.all(
      ["relationship", "health", "safety"].map(async (name) => {
        const file = new URL(`../docs/guides-ar/${name}.json`, import.meta.url);
        return JSON.parse(await readFile(file, "utf8")).guides;
      }),
    )
  ).flat();
  assert.equal(guides.length, sources.length);
  assert.equal(new Set(guides.map((guide) => guide.id)).size, guides.length);
  for (const source of sources) {
    const guide = guides.find((item) => item.id === source.id);
    assert.ok(guide, `Missing ${source.id}`);
    assert.equal(guide.source.url, source.url);
    assert.equal(guide.source.license, source.license);
    assert.ok(guide.points_ar.length >= 2);
  }
});
