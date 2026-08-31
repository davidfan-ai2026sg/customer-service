# Aunty Hong customer-service bot (Hong)

Hong is a 24/7 English WhatsApp bot for Aunty Hong (auntyhong.sg).

Host it on Vercel. Hong quotes the catalogue, takes orders (prefix AH, minimum S$50), and emails a kitchen sheet to kitchen@auntyhong.sg.

This repo is the bot plus a thin audit UI, not a staff CMS. Inbox, catalogue and orders screens are for watching Hong, taking over a hard chat, and sending a confirmed order to the kitchen. Customers never use those pages.

Demo needs no third-party credentials: the built-in customer simulator talks to the same scripted bot as the live channel.

Kitchen: 1005 Aljunied Ave 5 #01-42, Singapore 389886. No walk-in shop. Currency SGD (S$).

## Local run

Needs Node.js 18+. Install dependencies, then start the development server. Open http://localhost:3000

Production uses the build and start scripts. You may copy .env.example to .env.local.

SQLite defaults to data/app.db (override with DATABASE_PATH). First start seeds the Aunty Hong catalogue.

## How to demo

1. Open /. The right-hand Customer simulator is a fake chat thread.
2. Ask: how much are the shrimp fries?
3. Order: place an order, then SQ0179319 (gold tin shrimp fries, S$22), then 3, then no, then delivery, then name, +65 9123 4567, address, none, then confirm.
4. Open /orders. A new Pending order appears (AH..., total S$66).
5. Open the order and send it to the kitchen (copy or print the kitchen sheet). Status becomes Sent to kitchen.
6. Take over a chat to pause Hong; resume to put automatic replies back on.

## Hosted 24/7 (Vercel plus WhatsApp Cloud API)

Deploy this Next.js app to Vercel (or any Node host) so Hong stays up overnight. Then wire the official Cloud API. No unofficial WhatsApp web libraries.

1. In Meta Developer, create an app, add WhatsApp, and collect the access credentials and a verify string.
2. Give the deployment a public HTTPS URL.
3. Callback path: /api/whatsapp/webhook. The verify string must match WHATSAPP_VERIFY_TOKEN. Subscribe to messages.
4. Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, and PUBLIC_APP_URL.

If those env vars are empty, the live channel is off and the simulator still works.

## Tests

The test script runs quote-to-order and prints HAPPY_PATH_PASS. Browser tests use the test:e2e script and need the app already on port 3000.

## Pages (audit only)

- / inbox and customer simulator
- /orders orders Hong submitted
- /orders/:id detail, status, send to kitchen
- /orders/:id/print printable kitchen sheet
- /catalog products Hong quotes
- /settings company copy Hong uses in replies

APIs under /api: conversations, demo chat, products, orders, settings, WhatsApp webhook, health.

## Optional email and LLM

Kitchen email: configure RESEND_API_KEY or SMTP_*. If neither is set, Hong still builds the kitchen sheet; it just does not send mail.

LLM: OPENAI_API_KEY only polishes wording. It must not change prices, quantities, or order numbers. Without a key, Hong uses catalogue keyword matching.

All keys are listed in .env.example.
