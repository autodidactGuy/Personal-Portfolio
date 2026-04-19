# Contact Form Setup & Deployment

The portfolio contact form uses a Cloudflare Worker to receive submissions, validate input, and deliver emails via Resend.

## Architecture

```
Browser → Cloudflare Worker (/contact) → Resend API → Inbox
```

1. The Next.js static site submits a POST request to the worker.
2. The worker validates the origin, runs spam checks, and validates the payload.
3. Approved submissions are forwarded to the inbox through the Resend email API.

## Required Cloudflare Worker Secrets

Set these via `wrangler secret put <NAME>` from the `cloudflare-worker/` directory:

| Secret | Description |
|---|---|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com). Required for email delivery. |

Without `RESEND_API_KEY` or `CONTACT_EMAIL`, the worker returns **503 Service Unavailable** for every contact submission. `CONTACT_EMAIL` is a required worker var (not a secret), and `CONTACT_EMAIL` and `FROM_EMAIL` are set as vars in `wrangler.jsonc` (see below) so they deploy automatically, but can be overridden with secrets if needed.

## Optional Cloudflare Worker Secrets

| Secret | Description | Default |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key for bot verification. When set, every submission must include a valid Turnstile token. | _(Turnstile check skipped)_ |

## Worker Environment Variables (wrangler.jsonc)

These are already configured in `cloudflare-worker/wrangler.jsonc`:

| Variable | Purpose |
|---|---|
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed to call the `/contact` endpoint. |
| `ORIGIN` | Fallback origin (used by the OAuth flow and as a secondary origin check). |
| `CONTACT_EMAIL` | Inbox email address where contact form submissions are delivered. |
| `FROM_EMAIL` | Verified sender address in Resend (default: `noreply@contact.hassanraza.us`). |

## Required Frontend Environment Variables

Set these at build time for the Next.js site:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_CONTACT_WORKER_URL` | Full URL of the deployed Cloudflare Worker (e.g. `https://personal-portfolio.hassanraza632.workers.dev`). | Hardcoded fallback in `next.config.mjs` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key. When set, the form renders the Turnstile widget and attaches the token to submissions. | _(widget not rendered)_ |

## Resend Template Setup

The worker sends emails using a Resend template. Create a template in the Resend dashboard:

1. Go to **Templates** in the [Resend dashboard](https://resend.com/templates).
2. Create a template with the slug/ID **`contact-form-submission`**.
3. The template receives these variables:

| Variable | Content |
|---|---|
| `sender_name` | Submitter's name |
| `sender_email` | Submitter's email |
| `sender_phone` | Submitter's phone (empty string if not provided) |
| `subject` | Message subject |
| `message` | Message body |
| `submitted_at` | ISO 8601 timestamp of submission |

4. Verify the sender domain (or the specific `FROM_EMAIL` address) in Resend so that outbound emails are authorized.

## Spam Controls

The worker applies three layers of spam protection:

### 1. Honeypot Field

A hidden `_hp` field is rendered off-screen. Bots that fill it trigger a silent 200 response with no email sent.

### 2. Cloudflare Turnstile (optional)

When `TURNSTILE_SECRET_KEY` is configured on the worker and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set at build time:

- The form renders a Turnstile challenge widget.
- The token is attached to the submission payload.
- The worker verifies the token server-side before processing.
- Requests without a valid token are rejected with **403**.

### 3. IP Rate Limiting

Each client IP is limited to **5 submissions per 10-minute window**. Exceeding the limit returns **429 Too Many Requests**. Rate limit state is held in worker memory and pruned periodically.

## Deployment Steps

### 1. Deploy the Cloudflare Worker

```bash
cd cloudflare-worker
yarn install
wrangler secret put RESEND_API_KEY
# Optional:
# wrangler secret put TURNSTILE_SECRET_KEY
wrangler deploy
```

### 2. Verify the Worker

```bash
# Should return 403 (origin not allowed from curl)
curl -s -o /dev/null -w '%{http_code}' \
  -X POST https://personal-portfolio.hassanraza632.workers.dev/contact

# Should return 204 (CORS preflight from allowed origin)
curl -s -o /dev/null -w '%{http_code}' \
  -H "Origin: https://hassanraza.us" \
  -X OPTIONS https://personal-portfolio.hassanraza632.workers.dev/contact
```

### 3. Build and Deploy the Site

Ensure the environment variables are set during the Next.js build:

```bash
NEXT_PUBLIC_CONTACT_WORKER_URL=https://personal-portfolio.hassanraza632.workers.dev \
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key \
  yarn build
```

### 4. End-to-End Verification

1. Open the live site contact page.
2. Fill in all fields and submit.
3. Confirm a success toast appears and the form resets.
4. Check the target inbox for the delivered email.
5. Submit with an invalid email to confirm client-side validation fires.
6. Submit rapidly (6+ times) to confirm rate limiting returns an error.

## Response Codes Reference

| Code | Meaning |
|---|---|
| 200 | Submission accepted and email sent (or honeypot triggered — silent success) |
| 204 | CORS preflight accepted |
| 400 | Invalid JSON body |
| 403 | Origin not allowed, or Turnstile verification failed/missing |
| 405 | HTTP method not allowed (only POST and OPTIONS accepted) |
| 415 | Content-Type is not `application/json` |
| 422 | Payload validation failed (missing/invalid fields) |
| 429 | Rate limit exceeded |
| 502 | Resend API returned an error (check API key and sender domain) |
| 503 | `RESEND_API_KEY` or `CONTACT_EMAIL` not configured |

## Troubleshooting

| Symptom | Likely Cause |
|---|---|
| 503 on every submission | `RESEND_API_KEY` secret is missing (run `wrangler secret put RESEND_API_KEY`), or `CONTACT_EMAIL` var was removed from `wrangler.jsonc`. |
| 502 on submission | Resend rejected the request. Check that the API key is valid, the sender domain is verified, and the `contact-form-submission` template exists. |
| 403 "Invalid origin" | The site origin is not in `ALLOWED_ORIGINS`. Update `wrangler.jsonc` and redeploy. |
| 403 "Bot verification required/failed" | `TURNSTILE_SECRET_KEY` is set but the frontend is not sending a token. Ensure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set at build time. |
| Form submits but no email arrives | Check Resend dashboard logs. Verify the `CONTACT_EMAIL` and sender domain configuration. |
