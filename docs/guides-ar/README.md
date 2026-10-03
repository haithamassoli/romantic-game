# الأدلة العربية للزوجين

تضم ملفات JSON هنا 295 دليلاً مختصراً بالعربية في 11 ملفاً، يعرضها الموقع في `/guides` مقسّمة إلى أقسام (`lib/guides.ts`). مصادرها في `docs/guides-src/sources.json`، وتشمل أيضاً ويكيبيديا (CC BY-SA 4.0) وكتب Project Gutenberg (ملكية عامة). يحمل كل دليل رابط المصدر والمؤلف والترخيص وبيان التعديل. النصوص ملخصات عربية محررة، وليست ترجمة طبية معتمدة.

| المصدر | النص المستخدم | شروط إعادة الاستخدام |
| --- | --- | --- |
| [NHS](https://www.nhs.uk/our-policies/terms-and-conditions/) | صفحات التثقيف الصحي | ترخيص OGL 3.0 مع بيان النسب داخل كل دليل؛ الصور مستثناة. |
| [LibreTexts](https://socialsci.libretexts.org/Bookshelves/Gender_Studies/Sexuality_the_Self_and_Society_(Ruhman_Bowman_Jackson_Lushtak_Newman_and_Sunder)) | فصول من كتاب Sexuality, the Self, and Society | CC BY 4.0 مع نسبة المؤلفين ورابط الترخيص. |
| [MedlinePlus](https://medlineplus.gov/about/using/usingcontent/) | قسم Summary فقط من صفحات Health Topics | نص عام الملكية؛ روابط ومقالات الجهات الأخرى والصور غير مشمولة. |
| [Office on Women's Health](https://womenshealth.gov/about-us/work-us/collaborate-us) | نصوص حكومية في صفحات الموضوعات | نص عام الملكية؛ الصور والمطبوعات المرتبطة بجهات أخرى غير مشمولة. |
| [National Cancer Institute](https://www.cancer.gov/policies/copyright-reuse) | نصوص صفحات التثقيف للمرضى | نص عام الملكية مع نسبة المعهد والتنويه بأن الترجمة غير معتمدة منه؛ الصور والشعار غير مشمولين. |

لفحص توفر المصادر: `node scripts/build-guides.mjs --check-sources`.

لإضافة دليل: أضف مصدره إلى `sources.json` ثم شغّل `node scripts/build-guides.mjs` مع `OPENAI_API_KEY`. يُترجم السكربت المصادر الجديدة فقط إلى `docs/guides-src/ar/`، ويعيد بناء ملفات هذا المجلد منها. راجع الصياغة الطبية العربية قبل النشر.
