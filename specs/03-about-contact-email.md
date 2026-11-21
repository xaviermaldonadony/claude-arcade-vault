# SPEC 03 — About contact form email via Resend

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-11-20
> **Objective:** Send each valid About contact form submission by email through Resend to the owner's inbox, with the visitor's address as Reply-To, and store nothing.

## Why this spec exists

SPEC 02 ported the About page with a client-only contact form. It validates the fields, shows the success panel, and stores nothing, and it lists "sending contact messages anywhere" as out of scope, to be a separate spec. This is that spec. It amends SPEC 02's out-of-scope and decision entries for email. SPEC 02 is not edited: this spec is the record of the change.

The template in `references/templates/home-about/` has no backend. The form design stays as in SPEC 02. Only the submit path changes: the form posts to a server endpoint, and the endpoint sends the email with Resend.

## Scope

**In:**

- A server endpoint `POST /api/contact` (Next.js route handler) that accepts JSON `{ name, email, msg, website }`, validates it, and sends one email with Resend.
- Resend as the email provider, through the `resend` npm package, called only from the server.
- Server-side validation that repeats the client rules and adds an email format check and length caps.
- A hidden honeypot field `website` in the form. Bots that fill it get a success response and no email.
- Client changes in `components/about.tsx`: the submit calls the endpoint, disables the submit button while the request is pending, shows the success panel only after a successful response, and shows an error line on failure with the typed values kept.
- Env vars: `RESEND_API_KEY` (secret), `CONTACT_TO_EMAIL` (recipient), `CONTACT_FROM_EMAIL` (sender). Documented in a committed `.env.example` with placeholder values.
- A `.gitignore` exception so `.env.example` is committed while `.env*` stays ignored.
- The sender is Resend's test address `onboarding@resend.dev`, which delivers only to the email address of the Resend account owner. `CONTACT_TO_EMAIL` must be that address while the test sender is in use.
- Email format: plain text, one subject line, Reply-To set to the visitor's email.

**Out of scope (for future specs):**

- A verified custom domain, DNS records (SPF, DKIM), and a non-test From address. Switching to a domain later is an env var change plus a DNS setup outside this repo.
- Storing messages in any form: no file, database, `localStorage`, or log of the message body. Only the inbox keeps them.
- Rate limiting per IP or per address. A serverless in-memory limit does not hold across instances, so it needs a shared store chosen in a later spec.
- Auto-reply to the visitor, confirmation emails, or a copy sent to the visitor.
- HTML email, templates, attachments, or multiple recipients.
- Spanish or any other language for the email body or subject.
- Captcha or any third-party bot check beyond the honeypot.
- Owner review of the placeholder marketing claims (SPEC 02 Decisions). Not an email concern.
- Tests. The repo has no test runner (see `CLAUDE.md`). Endpoint checks are manual, with `curl` and the browser.

## Data model

Request body, JSON, `Content-Type: application/json`:

```ts
// app/api/contact/route.ts (or lib/contact.ts, if shared)
export type ContactInput = {
  name: string; // trimmed, 1 to 80 characters
  email: string; // trimmed, 1 to 254 characters, simple format check
  msg: string; // trimmed, 1 to 2000 characters
  website: string; // honeypot, must be "" for a real visitor
};

export type ContactErrorField = 'name' | 'email' | 'msg';

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: 'validation'; field: ContactErrorField }
  | { ok: false; error: 'send_failed' };
```

Response status codes:

- `200` `{ ok: true }`: email sent, or honeypot filled (no email sent).
- `400` `{ ok: false, error: 'validation', field }`: the first failing field, checked in the order name, email, msg. Also used for invalid JSON or a missing body, with `field` set to `msg`.
- `500` `{ ok: false, error: 'send_failed' }`: Resend call failed, or an env var is missing.

Email sent (one per valid submission):

- `from`: `CONTACT_FROM_EMAIL`, default `onboarding@resend.dev` when unset.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: the visitor's trimmed email.
- `subject`: `Arcade Vault contact: <name>`, with CR and LF removed from the name and the name cut to 80 characters.
- `text`: four lines: `Name: <name>`, `Email: <email>`, a blank line, then the message as written. Plain text only, no HTML.

Env vars (all server-only, none prefixed `NEXT_PUBLIC_`):

| Name                 | Required | Value                                                                                                   |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`     | yes      | Resend API key. Lives in `.env.local`, never committed.                                                 |
| `CONTACT_TO_EMAIL`   | yes      | Inbox that receives messages. Must be the Resend account owner's address while the test sender is used. |
| `CONTACT_FROM_EMAIL` | no       | Sender address. Defaults to `onboarding@resend.dev`.                                                    |

No new `localStorage` keys. No new storage of any kind.

## Implementation plan

1. **Dependency and env template.** Add the `resend` package with `npm install resend`. Create `.env.example` with the three variables and placeholder values. Add `!.env.example` to `.gitignore` after the `.env*` line, so the template is committed and real env files stay ignored. Verify with `git status` that `.env.example` is listed and `.env.local` is not.
2. **Validation helper.** Create `lib/contact.ts` (server-safe, no React imports) exporting `ContactInput`, `ContactErrorField`, and `validateContact(input: unknown)`. It returns the normalized input or the first failing field. It trims values, applies the length caps, checks the email format, and reads `website`. Verify with `npx tsc --noEmit`.
3. **Endpoint.** Create `app/api/contact/route.ts` exporting `POST`. Read the JSON body with a try and return `400` on parse failure. If `website` is non-empty, return `200` `{ ok: true }` and send nothing. Otherwise run `validateContact`, and return `400` on failure. Create the Resend client inside the handler, not at module level, so `npm run build` works without `RESEND_API_KEY`. If the key or `CONTACT_TO_EMAIL` is missing, return `500` `send_failed`. Call `resend.emails.send` with the fields from the Data model. On a Resend error result or a thrown error, log the status or error name only, never the message body or the key, and return `500` `send_failed`. Before writing this file, read the route handler guide in `node_modules/next/dist/docs/` as `AGENTS.md` and `CLAUDE.md` require, and check the current `resend` SDK call shape through Context7.
4. **Client submit.** In `components/about.tsx`, change `onSubmit` to an async handler. Keep the existing blank-field check and `shake` behavior, which runs before any request. If a field is blank after trim, stop as today, with no request. Otherwise set a `pending` state, disable the submit button and show a pending label, then `POST` `{ name, email, msg, website }` to `/api/contact` as JSON. On `200` with `ok: true`, set `sent` to the trimmed name, which shows the success panel as in SPEC 02. On `400` or `500`, keep the fields, show an error line under the form, and do not show the success panel. A second submit while pending does nothing.
5. **Honeypot field.** Add an `<input name="website">` inside the form, hidden from sighted users and assistive technology: `aria-hidden="true"`, `tabIndex={-1}`, `autoComplete="off"`, with a class `hp-field` in `app/arcade.css` that positions it off screen. It is not inside a label. Its value is part of the POST body. The field is not cleared on success because the form is reset by `SEND ANOTHER MESSAGE` as before.
6. **Error line.** Add an error line under the form for the failure cases. Copy, in English, in the template's terminal voice: `> ERROR: MESSAGE NOT SENT. CHECK YOUR CONNECTION AND TRY AGAIN.` for `send_failed`, and `> ERROR: CHECK THE <FIELD> FIELD.` for `validation`, with `<FIELD>` replaced by NAME, EMAIL, or MESSAGE. Style it in `app/arcade.css` with a new class, reusing the existing terminal colors. Uses the `/frontend-design` skill, as `CLAUDE.md` requires for UI. The error line clears on the next submit.
7. **Environment check.** Create `.env.local` locally (not committed) with a real `RESEND_API_KEY` and `CONTACT_TO_EMAIL` set to the account owner's address. Restart `npm run dev` so the env vars load. Run the endpoint checks in the acceptance criteria with `curl`, then the form checks in the browser.
8. **Docs.** Update `CLAUDE.md` Architecture with one short paragraph: the `POST /api/contact` route, Resend as the provider, the env vars, and that the route is the only server code path for the form. Do not touch the `AGENTS.md` block. Do not edit SPEC 01 or SPEC 02.

Every step leaves `npm run dev` running with every route rendering. Steps 1 to 3 change no visible UI. Step 4 changes the submit path, so the form works end to end only after step 4.

## Acceptance criteria

- [ ] `npm run build` exits 0 with `RESEND_API_KEY` unset.
- [ ] `npm run lint` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `git check-ignore .env.local` reports the file as ignored, and `git ls-files .env.example` lists the template file.
- [ ] `RESEND_API_KEY` appears in no client bundle and in no response body: `grep` for the key value in the `.next` output and in the `curl` responses finds nothing.
- [ ] `curl -X POST /api/contact` with valid JSON (`name` `Kai`, `email` `kai@example.com`, `msg` `Hello`, `website` `""`) returns `200` `{"ok":true}`.
- [ ] That valid request delivers one email to `CONTACT_TO_EMAIL`, with subject `Arcade Vault contact: Kai`, Reply-To `kai@example.com`, and a body containing `Name: Kai`, `Email: kai@example.com`, and `Hello`.
- [ ] The same request with `email` `not-an-email` returns `400` `{"ok":false,"error":"validation","field":"email"}` and sends no email.
- [ ] A `name` of 81 characters returns `400` with `field` `name`. A `msg` of 2001 characters returns `400` with `field` `msg`.
- [ ] A request with `website` set to `bot` returns `200` `{"ok":true}` and sends no email.
- [ ] A request with a body that is not JSON returns `400` and sends no email.
- [ ] With `RESEND_API_KEY` unset, a valid request returns `500` `{"ok":false,"error":"send_failed"}`, and the server log contains no message body.
- [ ] The subject of a sent email contains no CR or LF, when `name` contains a newline.
- [ ] On `/about`, submitting with any field blank adds `shake` to the form and sends no request (verified in the browser network panel).
- [ ] On `/about`, a valid submit disables the submit button while the request is pending.
- [ ] On `/about`, a valid submit with a successful response shows the terminal panel `> MESSAGE RECEIVED. WE WILL REPLY SOON. THANKS, <NAME>.` with the name uppercased, and the email arrives.
- [ ] On `/about`, a valid submit with the key unset shows the `send_failed` error line, keeps NAME, EMAIL, and MESSAGE filled in, and shows no success panel.
- [ ] `SEND ANOTHER MESSAGE` after success returns to an empty form and clears the error line.
- [ ] The honeypot input is not visible, is not reachable with Tab, and is present in the form DOM with `name="website"`.
- [ ] Submitting the `/about` form does not change `localStorage` (no new keys, no changed values), as SPEC 02 requires.
- [ ] No console errors and no React hydration warning on `/about`.
- [ ] No file, database row, or `localStorage` entry is written by the endpoint: `git status` after a successful submit shows no new data file, and the endpoint has no write call other than `resend.emails.send`.
- [ ] SPEC 02 acceptance criteria for `/about` still pass, except the success-panel timing, which now waits for the server response.

## Decisions

- **Yes:** Resend as the email provider. The user chose it for this feature.
- **Yes:** Route handler `POST /api/contact`, not a Server Action. It gives an explicit URL, is testable with `curl`, and the same contract works for any later client. Chosen over a Server Action, which has no public URL and is harder to test without a browser.
- **Yes:** Server-side validation that repeats the client rules, plus an email format check and length caps (name 80, email 254, msg 2000). The client check alone can be bypassed, and a bad address would reach the inbox.
- **No:** Non-blank-only server check. It matches the client but lets malformed addresses and oversized messages through.
- **Yes:** Hidden honeypot `website` field. It stops simple bots without storing IPs or adding a third-party service. Bots get `200` so they do not learn the rule.
- **No:** Rate limiting now. In-memory limits do not hold across serverless instances, and a shared store is a separate decision.
- **No:** Captcha. It adds a third-party dependency and a visible step for the visitor, which the honeypot avoids.
- **Yes:** Test sender `onboarding@resend.dev` now. It needs no domain setup. Its limit (delivery only to the account owner) is accepted until a verified domain exists, which is out of scope.
- **Yes:** `CONTACT_FROM_EMAIL` env var with the test sender as default. Switching to a verified domain then needs no code change.
- **Yes:** Recipient in `CONTACT_TO_EMAIL` env var, not hardcoded. The address is not kept in the repo.
- **Yes:** Reply-To set to the visitor's email. The owner can answer from the mail client, and the visitor's address is validated first.
- **Yes:** Plain-text email, no HTML. Visitor text is never rendered as markup, which removes an injection surface and needs no template.
- **Yes:** Email only, nothing stored. Matches SPEC 02's no-storage rule. Storage would need its own spec and a storage target.
- **Yes:** Error line that keeps the typed values. A failed send should not force the visitor to retype a long message. Chosen over a generic error that clears the form.
- **Yes:** Submit button disabled while pending. Prevents duplicate emails from double clicks.
- **Yes:** Server-side logging limited to status or error name. Message bodies and keys stay out of logs.
- **Yes:** `.gitignore` exception for `.env.example`. The existing `.env*` rule would otherwise hide the template.
- **Yes:** Resend client created inside the handler. `npm run build` then works without the key, and the key is read only at request time.
- **No:** Confirmation email to the visitor. Not requested, and it adds a second send per submit.
- **No:** Storing messages in `localStorage` as a fallback when Resend fails. It would keep message bodies in the browser and contradict SPEC 02.

## Identified risks

| Risk                                                                                                    | Mitigation                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Test sender delivers only to the account owner, so messages to any other address fail                   | Accepted until a verified domain exists. `CONTACT_TO_EMAIL` is set to the owner's address. Out of scope to change.                |
| `RESEND_API_KEY` leaks to the browser through a `NEXT_PUBLIC_` name or a server import in a client file | Keep the key read only in `app/api/contact/route.ts` or a server-only helper. Acceptance criterion checks the bundle with `grep`. |
| Bots fill the form despite the honeypot                                                                 | Accepted for now. Rate limiting or captcha is a later spec, listed in Scope.                                                      |
| Resend outage or quota exhaustion makes every send fail                                                 | Error line keeps typed values, so the visitor can retry. No silent drop.                                                          |
| Double submit sends two emails                                                                          | Submit button disabled while pending and a second submit does nothing.                                                            |
| `.gitignore` `.env*` rule hides `.env.example`                                                          | Step 1 adds the `!.env.example` exception and checks it with `git ls-files`.                                                      |
| Next.js 16 route handler API differs from older docs                                                    | Step 3 reads `node_modules/next/dist/docs/` first, as `AGENTS.md` requires.                                                       |
| Visitor input in the subject line injects headers                                                       | Subject built from the name with CR and LF removed and length capped at 80. Body is plain text.                                   |

## What is **not** in this spec

- A verified custom domain, DNS records, or a non-test From address.
- Storing messages anywhere.
- Rate limiting, captcha, or any bot check beyond the honeypot.
- Auto-reply or copies to the visitor.
- HTML email or templates.
- Spanish or i18n in the email.
- Tests or a test runner.
- Any change to SPEC 01's or SPEC 02's files. Their email-related scope and decision entries are superseded by this spec, not edited.
