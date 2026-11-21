"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { HighlightIcon } from "@/components/pixel-icons";
import { useReveal } from "@/components/use-reveal";
import { ABOUT_HIGHLIGHTS } from "@/lib/data";

type ContactForm = { name: string; email: string; msg: string };

// About page at "/about" (SPEC 02, step 8). Hero, highlights, divider, contact intro and form.
// The form is a client-side mock. Submit handling (validation, success panel) is added in step 9.
export function About() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  const [form, setForm] = useState<ContactForm>({ name: "", email: "", msg: "" });
  const id = useId();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ABOUT</div>
        <h1 className="about-title">ABOUT ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT was born from a love of classic video games. Our mission is to preserve and
          celebrate the arcade games that defined a generation, making them accessible to everyone,
          anywhere, at no cost.
        </p>

        <div className="highlight-row">
          {ABOUT_HIGHLIGHTS.map((h, i) => (
            <div
              key={h.text}
              className={"highlight " + h.tone}
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <HighlightIcon kind={h.icon} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACT</div>
            <h2 className="contact-title">CONTACT US</h2>
            <p className="contact-sub">
              Have a suggestion, want to propose a game, or just want to say hi? Write to us.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led"></span>REPLY WITHIN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y"></span>SUGGESTIONS WELCOME
              </div>
              <div className="tip">
                <span className="tip-led m"></span>NO SPAM, EVER
              </div>
            </div>
          </div>

          <form className="contact-form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor={`${id}-name`}>NAME</label>
              <input
                id={`${id}-name`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="px_kai"
              />
            </div>
            <div className="field">
              <label htmlFor={`${id}-email`}>EMAIL</label>
              <input
                id={`${id}-email`}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="player@vault.gg"
              />
            </div>
            <div className="field">
              <label htmlFor={`${id}-msg`}>MESSAGE</label>
              <textarea
                id={`${id}-msg`}
                rows={5}
                value={form.msg}
                onChange={(e) => setForm({ ...form, msg: e.target.value })}
                placeholder="Tell us what you have in mind…"
              ></textarea>
            </div>
            <button className="btn xl press" type="submit" style={{ width: "100%" }}>
              ▶  SEND MESSAGE
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
