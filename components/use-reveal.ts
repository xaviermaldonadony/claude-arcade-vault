"use client";

import { useEffect, type RefObject } from "react";

// Scroll reveal for the .reveal elements inside rootRef (SPEC 02, step 6).
// The hidden state in app/arcade.css applies only under html.js, which this hook sets after mount.
// So server HTML and first client render match, and content stays visible without JavaScript.
// Elements get the "in" class when they enter the viewport. With prefers-reduced-motion: reduce,
// every .reveal gets "in" at once and nothing is observed.
export function useReveal(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    document.documentElement.classList.add("js");
    const els = root.querySelectorAll<HTMLElement>(".reveal");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [rootRef]);
}
