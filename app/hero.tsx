"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type PointerEvent, useState } from "react";
import { siteImages } from "../lib/site-images";

// ponytail: a taste of the deck, copied from the gentlest "talk" cards in convex/seed.ts; the real game reads them from Convex.
const sample = [
  {
    title: "أول رغبة",
    body: "ليحكِ كلٌّ منكما عن أول تفصيل في الآخر أيقظ رغبته: نظرة، أو صوت، أو طريقة مشي.",
  },
  {
    title: "موضع للقبلة",
    body: "ليُشِر كلٌّ منكما إلى موضع في جسده يحب أن يُقبَّل فيه ولا يحظى بذلك كثيرًا.",
  },
  {
    title: "لمسة لا تُنسى",
    body: "ليتذكر كلٌّ منكما لمسة من الآخر ما زالت عالقة في جسده: أين كانت، ولماذا بقيت.",
  },
  {
    title: "أمسية على مقاسكما",
    body: "ليصف كلٌّ منكما أمسيته المثالية معًا، من أول نظرة حتى النوم، بكل تفصيل يشتهيه.",
  },
];

/** The candle follows the pointer; the whole room is only lit where it is. */
function moveLight(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  const style = event.currentTarget.style;
  style.setProperty("--x", `${event.clientX - box.left}px`);
  style.setProperty("--y", `${event.clientY - box.top}px`);
}

export function Hero() {
  const [top, setTop] = useState(0);

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      onPointerMove={moveLight}
      onPointerDown={moveLight}
    >
      <div className="hero-room" aria-hidden="true">
        <Image src={siteImages.hero.src} alt="" fill sizes="100vw" preload />
      </div>

      <div className="wrap hero-inner">
        <div className="hero-copy">
          <h1 id="hero-title">
            <span>اقتربا أكثر،</span>
            <em>على طريقتكما.</em>
          </h1>
          <p>
            أفكار وألعاب للحظات تجمعكما، تختارانها معًا وفق رغباتكما وحدودكما،
            وبالإيقاع الذي يريحكما.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/positions">
              استكشاف الوضعيات <span aria-hidden="true">↙</span>
            </Link>
            <Link className="text-link" href="/play">
              العبا معًا ←
            </Link>
          </div>
        </div>

        <div className="hero-deck">
          <button
            type="button"
            className="deck"
            onClick={() => setTop((top + 1) % sample.length)}
          >
            {sample.map((card, index) => {
              const place = (index - top + sample.length) % sample.length;
              return (
                <span
                  key={card.title}
                  className="deck-card"
                  data-place={place}
                  style={{ "--place": place } as CSSProperties}
                  aria-hidden={place !== 0}
                >
                  <b>{card.title}</b>
                  <span>{card.body}</span>
                </span>
              );
            })}
          </button>
          <p className="deck-caption">
            اضغطا البطاقة لسحب أخرى، أو{" "}
            <Link href="/play/cards">افتحا الرزمة كاملة</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
