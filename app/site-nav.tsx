"use client";

import type { MouseEvent, ReactNode } from "react";

// ponytail: native popover gives Escape, outside-tap dismiss and focus return for free.
function closeOnLink(event: MouseEvent<HTMLElement>) {
  if ((event.target as Element).closest("a")) event.currentTarget.hidePopover();
}

/** Inline links on wide screens, a popover menu behind a button on phones. */
export function SiteNav({ children }: { children: ReactNode }) {
  return (
    <>
      <button
        type="button"
        className="menu-toggle"
        popoverTarget="site-menu"
        aria-label="القائمة"
      >
        <span aria-hidden="true" />
      </button>
      <nav
        id="site-menu"
        className="site-nav"
        popover="auto"
        aria-label="التنقل الرئيسي"
        onClickCapture={closeOnLink}
      >
        {children}
      </nav>
    </>
  );
}
