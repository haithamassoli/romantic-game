"use client";

import { type MouseEvent, type ReactNode, useRef } from "react";

// ponytail: native popover gives Escape, outside-tap dismiss and focus return for free.
function closeOnLink(event: MouseEvent<HTMLElement>) {
  if ((event.target as Element).closest("a")) event.currentTarget.hidePopover();
}

/** Inline links on wide screens, a popover menu behind a button on phones, plus the showreel. */
export function SiteNav({ children }: { children: ReactNode }) {
  const reel = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  return (
    <>
      <span className="header-tools">
        <button
          type="button"
          className="reel-toggle"
          aria-haspopup="dialog"
          aria-label="شاهدا العرض"
          onClick={() => {
            reel.current?.showModal();
            video.current?.play();
          }}
        >
          <span aria-hidden="true">▶</span>
        </button>
        <button
          type="button"
          className="menu-toggle"
          popoverTarget="site-menu"
          aria-label="القائمة"
        >
          <span aria-hidden="true" />
        </button>
      </span>
      <nav
        id="site-menu"
        className="site-nav"
        popover="auto"
        aria-label="التنقل الرئيسي"
        onClickCapture={closeOnLink}
      >
        {children}
      </nav>
      <dialog
        ref={reel}
        className="zoom"
        aria-label="عرض معًا"
        closedby="any"
        onClose={() => video.current?.pause()}
      >
        <div className="zoom-bar">
          <form method="dialog">
            <button type="submit">إغلاق</button>
          </form>
        </div>
        <div className="zoom-scroll">
          <video
            ref={video}
            src="/showreel.mp4"
            controls
            playsInline
            preload="none"
          >
            <track
              kind="captions"
              src="/showreel.vtt"
              srcLang="ar"
              label="العربية"
            />
          </video>
        </div>
      </dialog>
    </>
  );
}
