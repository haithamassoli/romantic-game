import assert from "node:assert/strict";
import test from "node:test";
import { type Content, missing, publishError } from "./content.ts";

const position: Content = {
  slug: "new-pose",
  name: "وضعية",
  summary: "ملخص",
  description: "شرح",
  steps: ["خطوة"],
  care: ["ملاحظة"],
  difficulty: 2,
  intensity: 3,
  topics: ["positions"],
  constraints: ["knees"],
  imageId: "kg2abc",
  imageAlt: "رسم لزوجين بالغين",
  imageRights: "رسم الناشر",
};
const card: Content = {
  slug: "card-new",
  title: "عنوان",
  body: "نص",
  intensity: 1,
  topics: ["talk"],
  constraints: [],
};

test("a complete item may be published", () => {
  assert.deepEqual(missing("position", position), []);
  assert.deepEqual(missing("card", card), []);
  assert.deepEqual(missing("challenge", { ...card, minutes: 10 }), []);
  assert.equal(
    publishError("position", {
      ...position,
      imageId: undefined,
      image: "/a.png",
    }),
    null,
  );
});

test("publishing needs the filter tags, alt text and image rights", () => {
  const draft: Content = {
    slug: "new-pose",
    topics: [],
    constraints: [],
    imageAlt: " ",
    imageRights: "",
  };
  const gaps = missing("position", draft);
  for (const label of [
    "الصعوبة",
    "الجرأة",
    "موضوع واحد على الأقل من القائمة",
    "الرسم",
    "النص البديل للرسم",
    "حقوق الرسم",
  ]) {
    assert.ok(gaps.includes(label), label);
  }
  assert.match(
    publishError("position", draft) ?? "",
    /^لا يُنشر قبل إكمال: .*حقوق الرسم/,
  );
  assert.deepEqual(missing("card", { ...card, intensity: undefined }), [
    "الجرأة",
  ]);
});

test("tags must come from the shared vocabulary", () => {
  assert.deepEqual(missing("card", { ...card, topics: ["talk", "bdsm"] }), [
    "موضوع واحد على الأقل من القائمة",
  ]);
  assert.deepEqual(missing("card", { ...card, constraints: ["neck"] }), [
    "قيود جسدية من القائمة فقط",
  ]);
  assert.deepEqual(missing("card", { ...card, intensity: 4 }), ["الجرأة"]);
});

test("a desire needs its real-world action; timers stay sane", () => {
  assert.deepEqual(missing("desire", card), ["الخطوة الواقعية للرغبة"]);
  assert.deepEqual(missing("desire", { ...card, action: "افعلا" }), []);
  for (const minutes of [0, 1.5, 121, Number.NaN]) {
    assert.deepEqual(missing("card", { ...card, minutes }), [
      "مدة بين 1 و120 دقيقة",
    ]);
  }
});

test("a slug is a lasting Latin address", () => {
  for (const slug of [
    "",
    "Upper",
    "two  spaces",
    "-edge",
    "عربي",
    "a".repeat(61),
  ]) {
    assert.ok(
      missing("card", { ...card, slug }).includes("رابط لاتيني صالح"),
      slug,
    );
  }
});
