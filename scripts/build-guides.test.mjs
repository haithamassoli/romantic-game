import assert from "node:assert/strict";
import test from "node:test";
import {
  extractArticle,
  extractBook,
  extractWiki,
  guideError,
} from "./build-guides.mjs";

test("extracts article content without navigation and decodes entities", () => {
  const html = `<main><nav><p>Menu</p></nav><h1>Couples &amp; care</h1>
    <p class="intro">Start &quot;here&quot;.</p><article><h2>Talk</h2>
    <p>Ask each other.</p><ul><li>Listen &#38; pause.</li></ul>
    <aside><p>Advertisement</p></aside></article></main>`;

  assert.deepEqual(extractArticle(html, "html"), {
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

test("drops Wikipedia reference sections but keeps their subsections' peers", () => {
  const extract = `Intro line.\n\n== Technique ==\nGo slow.\n=== Detail ===\nBreathe.\n\n== See also ==\nOther page\n== References ==\n^ cite\n== Safety ==\nUse lube.`;
  assert.equal(
    extractWiki(extract),
    "Intro line.\nTechnique\nGo slow.\nDetail\nBreathe.\nSafety\nUse lube.",
  );
});

test("cuts one chapter out of a Gutenberg book", () => {
  const txt = `Header\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\nCHAPTER I.\n\nOn kissing\nwith care.\n\nCHAPTER II.\n\nOn embracing.\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nLicence`;
  assert.equal(
    extractBook(txt, "CHAPTER I.", "CHAPTER II."),
    "CHAPTER I.\nOn kissing with care.",
  );
});

test("accepts only complete Arabic guides", () => {
  const guide = {
    title_ar: "عنوان",
    summary_ar: "ملخص",
    points_ar: ["نقطة", "أخرى"],
    sections_ar: [{ heading_ar: "قسم", text_ar: "شرح" }],
  };
  assert.equal(guideError(guide), null);
  assert.equal(guideError({ ...guide, sections_ar: undefined }), null);
  assert.ok(guideError({ ...guide, points_ar: ["نقطة"] }));
  assert.ok(guideError({ ...guide, title_ar: "Title" }));
  assert.ok(
    guideError({ ...guide, sections_ar: [{ heading_ar: "قسم", text_ar: "" }] }),
  );
});

test("every configured source has one Arabic guide with matching rights", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const read = async (url) => JSON.parse(await readFile(url, "utf8"));
  const out = new URL("../docs/guides-ar/", import.meta.url);
  const sources = await read(
    new URL("../docs/guides-src/sources.json", import.meta.url),
  );
  const guides = [];
  for (const name of await readdir(out))
    if (name.endsWith(".json"))
      guides.push(...(await read(new URL(name, out))).guides);
  assert.equal(guides.length, sources.length);
  assert.equal(new Set(guides.map((guide) => guide.id)).size, guides.length);
  for (const source of sources) {
    const guide = guides.find((item) => item.id === source.id);
    assert.ok(guide, `Missing ${source.id}`);
    assert.equal(guide.source.url, source.url);
    assert.equal(guide.source.license, source.license);
    assert.equal(guideError(guide), null, source.id);
  }
});
