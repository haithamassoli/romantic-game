"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { draw } from "@/lib/play";
import {
  type Activity,
  ActivityCard,
  Empty,
  GameHead,
  kindLabel,
  Loading,
  useAllowed,
  useShared,
} from "../session";

type Pile = "question" | "dare";
const isQuestion = (card: Activity) => card.topics.includes("talk");

export default function CardsPage() {
  const deck = useAllowed("card");
  // On two phones both see the same card, and either can draw or skip.
  const [{ drawn, card: face, spent }, setTable] = useShared("cards", {
    drawn: [],
    card: null,
    spent: null,
  });
  // The card back says what happened when the button pressed has just gone.
  const back = useRef<HTMLDivElement>(null);

  if (!deck) return <Loading />;
  const card = deck.find((c) => c.slug === face) ?? null;

  const piles = {
    question: deck.filter(isQuestion),
    dare: deck.filter((c) => !isQuestion(c)),
  };
  const left = deck.filter((c) => !drawn.includes(c.slug)).length;

  function pull(pile: Pile) {
    const next = draw(piles[pile], drawn);
    flushSync(() =>
      setTable({
        drawn: next ? [...drawn, next.slug] : drawn,
        card: next?.slug ?? null,
        spent: next ? null : pile,
      }),
    );
    if (!next) back.current?.focus();
  }

  return (
    <>
      <GameHead title="بطاقات التحدي">
        سؤال أم تحدٍّ؟ اختارا واسحبا بطاقة. لا تتكرر بطاقة حتى تنتهي الرزمة، وكل
        ما فيها يقبله كلاكما.
      </GameHead>
      {deck.length === 0 ? (
        <Empty />
      ) : (
        <section className="wrap table" aria-label="الطاولة">
          <div className="card-stage" aria-live="polite">
            {card ? (
              <ActivityCard
                key={card.slug}
                item={card}
                label={kindLabel(card)}
              />
            ) : (
              <div className="card-back" ref={back} tabIndex={-1}>
                <span aria-hidden="true">✳</span>
                <p>
                  {spent
                    ? `سحبتما كل ${spent === "question" ? "الأسئلة" : "التحديات"} المتاحة. اخلطا الرزمة لتعود كلها، أو اسحبا من النوع الآخر.`
                    : // Also when the card on the table was just withdrawn.
                      drawn.length > 0
                      ? "اسحبا البطاقة التالية."
                      : "اسحبا أول بطاقة."}
                </p>
              </div>
            )}
          </div>

          <div className="play-actions">
            {piles.question.length > 0 && (
              <button
                type="button"
                className="button"
                onClick={() => pull("question")}
              >
                سؤال
              </button>
            )}
            {piles.dare.length > 0 && (
              <button
                type="button"
                className="button"
                onClick={() => pull("dare")}
              >
                تحدٍّ
              </button>
            )}
            {card && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => pull(isQuestion(card) ? "question" : "dare")}
              >
                تخطَّيا هذه البطاقة
              </button>
            )}
          </div>
          <p className="deck-count">
            {left > 0
              ? `لم تُسحب بعد: ${left} من ${deck.length}`
              : "سحبتما الرزمة كلها."}
            {drawn.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  flushSync(() =>
                    setTable({ drawn: [], card: null, spent: null }),
                  );
                  back.current?.focus();
                }}
              >
                اخلطا الرزمة من جديد
              </button>
            )}
          </p>
        </section>
      )}
    </>
  );
}
