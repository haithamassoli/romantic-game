"use client";

import { ActivityCard, Loading, SecretPicks, useAllowed } from "../session";

export default function DesiresPage() {
  const desires = useAllowed("desire");
  if (!desires) return <Loading />;
  return (
    <SecretPicks
      title="توافق الرغبات"
      intro="يختار كلٌّ منكما وحده ما يشتهيه الليلة، ثم لا يظهر إلا ما اختاره كلاكما، ليصير خطوة تبدآنها الآن."
      pool={desires}
      ask="ما تشتهيه الليلة"
      hint="لا يرى شريكك اختياراتك، ولا يظهر منها إلا ما اختاره هو أيضًا. اختر ما تريده فعلًا، لا ما تظن أنه يريده."
      option={(desire) => (
        <span>
          <strong>{desire.title}</strong>
          <small>{desire.body}</small>
        </span>
      )}
      reveal={(matches) =>
        matches.map((desire) => (
          <ActivityCard
            key={desire.slug}
            item={{ ...desire, body: desire.action ?? desire.body }}
            label="رغبة مشتركة"
          />
        ))
      }
    />
  );
}
