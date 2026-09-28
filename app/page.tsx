import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  games,
  IMAGE_SIZE,
  ideas,
  playModes,
  siteImages,
} from "../lib/site-images";
import { Hero } from "./hero";
import { ClearDataButton } from "./providers";
import { SiteNav } from "./site-nav";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main>
      <div className="grain" aria-hidden="true" />

      <div className="site-shell" id="top">
        <header className="site-header wrap">
          <a className="brand" href="#top" aria-label="معًا، العودة إلى البداية">
            <span className="brand-mark" aria-hidden="true" />
            معًا
          </a>
          <SiteNav>
            <Link href="/positions">الوضعيات</Link>
            <Link href="/guides">الأدلة</Link>
            <a href="#games">الألعاب</a>
            <a href="#play">اللعب</a>
          </SiteNav>
          <span className="adult-note">
            للبالغين فقط <b>+18</b>
          </span>
        </header>

        <Hero />
      </div>

      <section className="values wrap" aria-label="قيم التجربة">
        <div>
          <span aria-hidden="true">✧</span>
          <p>
            <strong>رغبتكما أولًا</strong>
            <small>لا يظهر إلا ما يناسب الطرفين</small>
          </p>
        </div>
        <div>
          <span aria-hidden="true">◇</span>
          <p>
            <strong>من دون ضغط</strong>
            <small>تخطّيا أو توقّفا في أي لحظة</small>
          </p>
        </div>
        <div>
          <span aria-hidden="true">∞</span>
          <p>
            <strong>خصوصية بسيطة</strong>
            <small>من دون حساب للأزواج</small>
          </p>
        </div>
      </section>

      <section
        className="guide-section"
        id="guide"
        aria-labelledby="guide-title"
      >
        <div className="wrap guide-grid">
          <div className="guide-art">
            <Image
              src={siteImages.guide.src}
              alt={siteImages.guide.alt}
              width={IMAGE_SIZE.width}
              height={IMAGE_SIZE.height}
              sizes="(max-width: 720px) 100vw, 50vw"
            />
          </div>
          <div className="guide-copy">
            <span className="section-kicker">01 / دليل الاستكشاف</span>
            <h2 id="guide-title">
              ابدآ بما
              <br />
              <em>يريحكما.</em>
            </h2>
            <p>
              دليل مصوّر يساعدكما على استكشاف الوضعيات وفهم خطواتها ومستوى
              صعوبتها واعتبارات الراحة، لتختارا ما يناسبكما.
            </p>
            <Link className="button guide-cta" href="/positions">
              افتحا دليل الوضعيات <span aria-hidden="true">↙</span>
            </Link>
            <p className="guide-more">
              <Link className="text-link" href="/positions/catalog">
                موسوعة الوضعيات ←
              </Link>
              <Link className="text-link" href="/guides">
                مكتبة الأدلة ←
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section
        className="ideas-section wrap"
        id="ideas"
        aria-labelledby="ideas-title"
      >
        <div className="section-heading">
          <div>
            <span className="section-kicker">لحظات صغيرة</span>
            <h2 id="ideas-title">
              أربع أفكار <em>لتبدآ منها.</em>
            </h2>
          </div>
          <p>
            من حديث خفيف إلى وقتكما الخاص؛ اختارا الإيقاع قبل أن تختارا اللعبة.
          </p>
        </div>
        <div className="ideas-grid">
          {ideas.map((idea) => (
            <article className="idea-card" key={idea.title}>
              <div className="idea-image">
                <Image
                  src={idea.src}
                  alt={idea.alt}
                  width={IMAGE_SIZE.width}
                  height={IMAGE_SIZE.height}
                  sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 25vw"
                />
              </div>
              <h3>{idea.title}</h3>
              <p>{idea.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="games-section wrap"
        id="games"
        aria-labelledby="games-title"
      >
        <div className="section-heading">
          <div>
            <span className="section-kicker">02 / وقتكما معًا</span>
            <h2 id="games-title">
              ست طرق <em>لتبدآ.</em>
            </h2>
          </div>
          <p>
            من سؤال خفيف إلى تجربة مشتركة؛ اختارا ما يلائم مزاجكما، وغيّرا رأيكما
            متى أردتما.
          </p>
        </div>
        <p className="coming-soon">
          الست كلها جاهزة، على جهاز واحد أو على هاتفين.{" "}
          <Link href="/play">ابدآ اللعب</Link>
        </p>
        <div className="games-grid">
          {games.map((game, index) => (
            <article className="game-card" key={game.title}>
              <div className="game-image">
                <Image
                  src={game.src}
                  alt={game.alt}
                  width={IMAGE_SIZE.width}
                  height={IMAGE_SIZE.height}
                  sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw"
                />
              </div>
              <div className="game-meta">
                <span>{String(index + 1).padStart(2, "0")} / تجربة</span>
                <span>جاهزة</span>
              </div>
              <h3>
                <Link href={game.href}>{game.title}</Link>
              </h3>
              <p>{game.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="play-section wrap"
        id="play"
        aria-labelledby="play-title"
      >
        <div className="section-heading">
          <div>
            <span className="section-kicker">03 / كيف تلعبان</span>
            <h2 id="play-title">
              جهاز واحد، <em>أو هاتفان.</em>
            </h2>
          </div>
          <p>تبقيان معًا في الجلسة نفسها، وتظهر لكما النتائج المشتركة فقط.</p>
          <Link className="button play-cta" href="/play">
            ابدآ اللعب <span aria-hidden="true">↙</span>
          </Link>
        </div>
        <div className="play-grid">
          {playModes.map((mode) => (
            <article className="play-card" key={mode.title}>
              <div className="play-image">
                <Image
                  src={mode.src}
                  alt={mode.alt}
                  width={IMAGE_SIZE.width}
                  height={IMAGE_SIZE.height}
                  sizes="(max-width: 720px) 100vw, 50vw"
                />
              </div>
              <div className="play-copy">
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section">
        <Image
          className="closing-photo"
          src={siteImages.closing.src}
          alt={siteImages.closing.alt}
          width={IMAGE_SIZE.width}
          height={IMAGE_SIZE.height}
          sizes="100vw"
        />
        <div className="wrap closing-inner">
          <span className="closing-flower" aria-hidden="true">
            ✳
          </span>
          <div>
            <span className="section-kicker">مساحة تصنعانها معًا</span>
            <h2>
              الأجمل أن يكون
              <br />
              <em>الاختيار لكما.</em>
            </h2>
          </div>
          <p>
            تحددان ما يناسبكما، وتتخطيان ما لا تريدان، وتستمتعان باللحظة من دون
            نقاط أو قواعد تضغط عليكما.
          </p>
        </div>
      </section>

      <footer className="site-footer wrap">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true" />
          معًا
        </a>
        <p>مساحة خاصة للأزواج البالغين. الرضا والراحة دائمًا أولًا.</p>
        <ClearDataButton />
        <span>© 2026 معًا</span>
      </footer>
    </main>
  );
}
