// HAMR /mailbox/{read,write} — Wave 2 PLACEHOLDERS.
// Full R2 JSONL mailbox + Google A2A envelope ships in Wave 3 child 5.
// Per HAMR v3.2 §5 child 5 + v3.2.1 §R2 (signed envelopes + replay protection).
import type { Env } from '../worker';

function notImplemented(route: string): Response {
  return new Response(JSON.stringify({
    error: 'not_implemented',
    detail: `${route} ships in Wave 3 child 5 (R2 JSONL mailbox + Google A2A envelope + signed-envelope verification per v3.2 §R2).`,
    placeholder: true,
  }), {
    status: 501,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

export async function mailboxRead(_env: Env): Promise<Response> {
  return notImplemented('/mailbox/read');
}

export async function mailboxWrite(_env: Env): Promise<Response> {
  return notImplemented('/mailbox/write');
}
