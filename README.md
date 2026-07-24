# HyperNode — Game Server Hosting Platform

A full-stack game server hosting platform (marketing site + customer dashboard + admin panel) built with **Next.js 14, Tailwind, Prisma/PostgreSQL, Stripe, and the Pterodactyl API**.

## What's inside

- **Marketing site** — home, games catalog (16 games), per-game pages with configurator, VPS & dedicated pages, blog, wiki/knowledgebase, live status page, legal pages.
- **Customer dashboard** — live console (websocket), power controls, file manager with editor, backups, databases, schedules, startup variables, settings, billing (Stripe portal), support tickets.
- **Admin panel** — platform overview (MRR, services, node health), orders (provision/suspend/terminate), plan ↔ egg mapping, customers, ticket queue, full Pterodactyl control (servers, nodes, allocations, locations, nests/eggs), blog & wiki editors.
- **Billing** — Stripe subscriptions with webhook-driven auto-provisioning, suspension on failed payment, termination on cancellation.

## Local development

```bash
# 1. Start the dev database
docker compose up -d

# 2. Configure environment
cp .env.example .env       # then fill in the values (see below)

# 3. Create schema + seed content
npx prisma db push
npx prisma db seed

# 4. Run
npm run dev
```

The **first account you register becomes the admin.**

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` | Public URL of the app |
| `PTERODACTYL_URL` | Panel base URL (no trailing slash) |
| `PTERODACTYL_APP_API_KEY` | Admin → Application API key |
| `PTERODACTYL_CLIENT_API_KEY` | Client API key of the **service account** (see below) |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe keys |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` or the dashboard webhook |

Without Stripe keys, checkout falls into **dev mode**: orders provision immediately with no payment — useful for local testing.

## Pterodactyl integration model

- Provisioned servers are **owned by a service account** — the Pterodactyl user whose client API key you configure. Create a dedicated user (e.g. `services@yourdomain`) on the panel, generate its client key, and keep it out of customer hands.
- Customers manage servers entirely through HyperNode; the platform proxies console/files/backups via the client API after checking order ownership. Their email is also invited as a panel subuser (best-effort) for direct access.
- **Websocket console:** browsers connect straight to Wings. If the console won't connect, add your HyperNode origin to `allowed_origins` in each node's `/etc/pterodactyl/config.yml` and restart Wings.
- **Egg mapping:** plans are auto-created on first purchase. Map each game to a nest/egg ID in **Admin → Plans** (IDs listed under **Admin → Nests & Eggs**). Tick *apply to all* to map every plan of a game at once.

## Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# put the printed whsec_… into STRIPE_WEBHOOK_SECRET
```

Handled events: `checkout.session.completed` (provision), `invoice.payment_failed` (suspend), `invoice.paid` (unsuspend), `customer.subscription.deleted` (terminate).

## Deploying to Railway

1. Create a project with a **PostgreSQL** service; Railway injects `DATABASE_URL`.
2. Deploy this repo as a service — `railway.json` builds and runs `prisma migrate deploy && seed && next start`.
   - Run `npx prisma migrate dev --name init` locally first and commit the `prisma/migrations` folder so `migrate deploy` has migrations to apply.
3. Set all environment variables from the table above in the service settings, with `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL` set to your Railway domain.
4. Point a Stripe webhook at `https://<your-domain>/api/stripe/webhook`.
5. If you are wiring up a production domain and a separate Pterodactyl panel hostname, see [DOMAIN_SETUP.md](./DOMAIN_SETUP.md).

## Notes

- VPS / dedicated / other non-game orders are created as **manual-fulfillment** orders — they appear in Admin → Orders for you to set up by hand and mark fulfilled.
- Locations shown on the marketing site are mirrored live from the panel (with graceful fallback when unreachable).
