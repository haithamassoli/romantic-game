"use client";

import Image from "next/image";
import Link from "next/link";
import { games, IMAGE_SIZE } from "@/lib/site-images";
import { store, useStored } from "../providers";
import { focusOnMount, useSession } from "./session";

export default function PlayHub() {
  const { limits, ended } = useSession();
  const timer = useStored("timer") !== "off";

  return (
    <>
      <section className="wrap play-head" aria-labelledby="play-title">
        {/* After "إنهاء الجلسة" the button is gone; land on the page heading instead. */}
        <h1
          id="play-title"
          ref={ended ? focusOnMount : undefined}
          tabIndex={-1}
        >
          العبا معًا
        </h1>
        <p>
          قبل أول لعبة يحدد كلٌّ منكما حدوده سرًّا، ثم لا يظهر إلا ما يقبله كلاكما.
          تخطَّيا ما لا يعجبكما، وأنهيا الجلسة متى شئتما: لا نقاط ولا خسارة.
        </p>
        <p className="pos-consent">
          اتفقا على كلمة للتوقف قبل أن تبدآ. أي تردد أو صمت أو «لا» يعني التوقف،
          لا المتابعة.
        </p>
        <p className="play-state" role="status">
          {limits
            ? "حدودكما محددة لهذه الجلسة؛ انتقلا بين الألعاب دون أن تُسألا من جديد."
            : ended
              ? "انتهت الجلسة، ومُحيت حدودكما واختياراتكما من هذا الجهاز."
              : ""}
        </p>
      </section>

      <fieldset className="wrap play-modes">
        <legend>كيف تلعبان؟</legend>
        <label className="mode">
          <input type="radio" name="mode" defaultChecked />
          <strong>على جهاز واحد</strong>
          <small>تتبادلان الهاتف، وتبقى حدود كلٍّ منكما مخفية عن الآخر.</small>
        </label>
        <label className="mode">
          <input type="radio" name="mode" disabled />
          <strong>على هاتفين</strong>
          <small>قريبًا: رمز يربط هاتفيكما في جلسة واحدة.</small>
        </label>
      </fieldset>

      <section className="wrap" aria-labelledby="games-title">
        <h2 id="games-title" className="play-subtitle">
          اختارا لعبة
        </h2>
        <ul className="game-list">
          {games.map((game) => (
            <li key={game.title}>
              <Link className="game-link" href={game.href}>
                <Image
                  src={game.src}
                  alt={game.alt}
                  width={IMAGE_SIZE.width}
                  height={IMAGE_SIZE.height}
                  sizes="8rem"
                />
                <span>
                  <strong>{game.title}</strong>
                  <small>{game.description}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <fieldset className="wrap play-prefs">
        <legend>على هذا الجهاز</legend>
        <label className="chip">
          <input
            type="checkbox"
            checked={timer}
            onChange={() => store("timer", timer ? "off" : "on")}
          />
          مؤقت مع الأنشطة الموقوتة
        </label>
      </fieldset>
    </>
  );
}
