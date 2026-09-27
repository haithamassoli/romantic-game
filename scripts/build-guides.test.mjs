import assert from "node:assert/strict";
import test from "node:test";
import { extractArticle } from "./build-guides.mjs";

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
