import { Resend } from 'resend';
import { validateContact, type ContactErrorField } from '@/lib/contact';

// Server-only. Never import this file from a client component.
// The Resend client is created per request so `npm run build` works without RESEND_API_KEY.

const DEFAULT_FROM_EMAIL = 'onboarding@resend.dev';
const SUBJECT_NAME_MAX = 80;

function validationError(field: ContactErrorField) {
  return Response.json({ ok: false, error: 'validation', field }, { status: 400 });
}

function sendFailed() {
  return Response.json({ ok: false, error: 'send_failed' }, { status: 500 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError('msg');
  }

  // Honeypot: bots that fill the hidden field get a success response and no email.
  const website =
    typeof body === 'object' && body !== null && 'website' in body
      ? (body as { website: unknown }).website
      : undefined;
  if (typeof website === 'string' && website.length > 0) {
    return Response.json({ ok: true });
  }

  const result = validateContact(body);
  if (!result.ok) {
    return validationError(result.field);
  }
  const { name, email, msg } = result.value;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  if (!apiKey || !to) {
    console.error('contact: missing RESEND_API_KEY or CONTACT_TO_EMAIL');
    return sendFailed();
  }

  // Subject: no CR or LF, name cut to 80 characters.
  const subjectName = Array.from(name.replace(/[\r\n]/g, ''))
    .slice(0, SUBJECT_NAME_MAX)
    .join('');

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Arcade Vault contact: ${subjectName}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${msg}`,
    });

    if (error) {
      console.error('contact: resend returned error', error.name);      return sendFailed();
    }
  } catch (err) {
    console.error('contact: resend call threw', err instanceof Error ? err.name : 'UnknownError');
    return sendFailed();
  }

  return Response.json({ ok: true });
}
