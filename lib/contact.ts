// Server-safe validation for the About contact form. No React imports.

export type ContactInput = {
  name: string; // trimmed, 1 to 80 characters
  email: string; // trimmed, 1 to 254 characters, simple format check
  msg: string; // trimmed, 1 to 2000 characters
  website: string; // honeypot, must be "" for a real visitor
};

export type ContactErrorField = 'name' | 'email' | 'msg';

export type ValidateContactResult =
  | { ok: true; value: ContactInput }
  | { ok: false; field: ContactErrorField };

const NAME_MAX = 80;
const EMAIL_MAX = 254;
const MSG_MAX = 2000;

// Simple shape check: something@something.something, no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function codePointLength(text: string): number {
  return Array.from(text).length;
}

// Returns the normalized input, or the first failing field in the order
// name, email, msg. Invalid or non-object input fails on msg.
export function validateContact(input: unknown): ValidateContactResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, field: 'msg' };
  }

  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  const msg = typeof raw.msg === 'string' ? raw.msg.trim() : '';
  const website = typeof raw.website === 'string' ? raw.website : '';

  const nameLength = codePointLength(name);
  if (nameLength < 1 || nameLength > NAME_MAX) {
    return { ok: false, field: 'name' };
  }

  const emailLength = codePointLength(email);
  if (emailLength < 1 || emailLength > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    return { ok: false, field: 'email' };
  }

  const msgLength = codePointLength(msg);
  if (msgLength < 1 || msgLength > MSG_MAX) {
    return { ok: false, field: 'msg' };
  }

  return { ok: true, value: { name, email, msg, website } };
}
