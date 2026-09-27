export const IMAGE_SIZE = { width: 1280, height: 720 } as const;

// ponytail: all 16 drawings share one card size; store width/height per image once the admin accepts other sizes.
export const POSITION_IMAGE_SIZE = { width: 1145, height: 1374 } as const;

export const siteImages = {
  hero: {
    src: "/images/hero.jpg",
    alt: "سرير مخملي عنابي مُعدّ لاثنين، مع حرير عاجي وشمعة وورود مجففة",
  },
  guide: {
    src: "/images/guide.jpg",
    alt: "دفتر مفتوح برسم شريطين ذهبيين وعدسة نحاسية بجانب شمعة",
  },
  closing: {
    src: "/images/closing.jpg",
    alt: "يدان تمسكان وردة عنابية فوق مخمل داكن وخاتم ذهبي",
  },
  texture: {
    src: "/images/texture.jpg",
    alt: "",
  },
  privacy: {
    src: "/images/privacy.jpg",
    alt: "قفل نحاسي قديم ومفتاح بجانب وردة وشمعة",
  },
  styleAnchor: {
    src: "/images/style-anchor.jpg",
    alt: "منضدة خشبية عليها كأس نبيذ وشمعة وحرير وورود مجففة",
  },
} as const;

export const games = [
  {
    title: "بطاقات التحدي",
    description: "أسئلة ولحظات صغيرة تفتح باب الحديث والتجربة معًا.",
    src: "/images/challenge-cards.jpg",
    alt: "ثلاث بطاقات كريمية وعنابية على حرير عاجي بجانب وردة ونجمة ذهبية",
  },
  {
    title: "عجلة الاختيار",
    description: "دعي المصادفة تقترح فكرة من الخيارات التي تناسبكما.",
    src: "/images/choice-wheel.jpg",
    alt: "عجلة ذهبية مزخرفة بقطاعات وردية وذهبية على منضدة خشبية",
  },
  {
    title: "توافق الرغبات",
    description: "اختياران خاصان، ثم تظهر الرغبات التي تلتقيان عندها فقط.",
    src: "/images/desire-match.jpg",
    alt: "يدان تقتربان فوق منضدة ويضيء بينهما شكل قلب ذهبي",
  },
  {
    title: "اكتشاف الوضعيات",
    description: "تصفّحا الأفكار كلٌ على حدة واكتشفا ما تودّان تجربته معًا.",
    src: "/images/position-match.jpg",
    alt: "إطاران نحاسيان متجاوران على حرير وفي المنتصف علامة اختيار ذهبية",
  },
  {
    title: "مسار الليلة",
    description: "خطوات قصيرة تختاران مدتها وإيقاعها، وتتوقفان متى شئتما.",
    src: "/images/night-path.jpg",
    alt: "مسار شموع صغيرة على أرضية غرفة تؤدي إلى سرير مخملي",
  },
  {
    title: "مكتبة التحديات",
    description: "أفكار واقعية تنتقل بكما من الشاشة إلى الوقت الذي يجمعكما.",
    src: "/images/challenge-library.jpg",
    alt: "كتاب جلدي مفتوح تخرج من صفحاته ورود مجففة بضوء شمعة",
  },
] as const;

export const playModes = [
  {
    title: "على جهاز واحد",
    description:
      "تجلسان معًا، ويدخل كل طرف حدوده بالتتابع دون أن يرى الآخر الإجابة.",
    src: "/images/play-one-device.jpg",
    alt: "هاتف واحد بين كأسين من النبيذ على حرير عاجي",
  },
  {
    title: "على هاتفين",
    description:
      "يربط أحدكما الجلسة برمز، ويبقى كل اختيار خاصًا حتى يكتمل الاثنان.",
    src: "/images/play-two-phones.jpg",
    alt: "هاتفان على مخمل عنابي يصل بينهما سلسلة ذهبية رفيعة",
  },
] as const;

export const ideas = [
  {
    title: "حديث هادئ",
    description: "تبدآن بكلام خفيف قبل أي تجربة.",
    src: "/images/idea-conversation.jpg",
    alt: "فنجانان من الشاي يتصاعد منهما البخار على صينية نحاسية",
  },
  {
    title: "لعب خفيف",
    description: "لحظة مرحة تكسر الجدية وتفتح الباب.",
    src: "/images/idea-play.jpg",
    alt: "شريط حرير عاجي معقود ونجمة ذهبية على مخمل عنابي",
  },
  {
    title: "وقتكما",
    description: "تختاران المدة، وتوقفان المسار متى شئتما.",
    src: "/images/idea-time.jpg",
    alt: "ساعة رملية نحاسية بجانب شمعة ووردة مجففة",
  },
  {
    title: "خصوصيتكما",
    description: "من دون حساب، ومن دون أن يطلع أحد على حدودكما.",
    src: "/images/privacy.jpg",
    alt: "قفل نحاسي قديم ومفتاح بجانب وردة وشمعة",
  },
] as const;
