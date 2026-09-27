"use client";

import { useState } from "react";
import { draw } from "@/lib/play";
import {
  type Activity,
  ActivityCard,
  Empty,
  GameHead,
  kindLabel,
  Loading,
  useAllowed,
} from "../session";

type Pile = "question" | "dare";
const isQuestion = (card: Activity) => card.topics.includes("talk");

export default function CardsPage() {
  const deck = useAllowed("card");
  const [drawn, setDrawn] = useState<string[]>([]);
  const [card, setCard] = useState<Activity | null>(null);
  const [spent, setSpent] = useState<Pile | null>(null);

  if (!deck) return <Loading />;

  const piles = {
    question: deck.filter(isQuestion),
    dare: deck.filter((c) => !isQuestion(c)),
  };
  const left = deck.filter((c) => !drawn.includes(c.slug)).length;

  function pull(pile: Pile) {
    const next = draw(piles[pile], drawn);
    setCard(next);
    setSpent(next ? null : pile);
    if (next) setDrawn([...drawn, next.slug]);
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
              <div className="card-back">
                <span aria-hidden="true">✳</span>
                <p>
                  {spent
                    ? `سحبتما كل ${spent === "question" ? "الأسئلة" : "التحديات"} المتاحة. اخلطا الرزمة لتعود كلها، أو اسحبا من النوع الآخر.`
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
                  setDrawn([]);
                  setCard(null);
                  setSpent(null);
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
