# HyperNode Domain Setup

This project uses two different public hostnames:

- `hypernode.gg` (or `www.hypernode.gg`) for the HyperNode marketing site and customer dashboard hosted on Railway
- `panel.hypernode.gg` for the Pterodactyl panel on your VPS

Recommended layout:

- `hypernode.gg` -> Railway app
- `www.hypernode.gg` -> Railway app
- `panel.hypernode.gg` -> VPS / reverse proxy for Pterodactyl

You can also add:

- `billing.hypernode.gg` later if you ever split billing onto another service
- `status.hypernode.gg` later if you move status off the main app

## 1. Connect the Railway app domain

In Railway, add `hypernode.gg` as a custom domain for the HyperNode web service.

Railway will give you:

- one routing record
- one verification `TXT` record

Important:

- both records are required
- root domains on Railway do **not** use a static `A` record
- use the exact `ALIAS`, `ANAME`, or CNAME-flattened target your DNS provider supports

Then add `www.hypernode.gg` too, usually as a separate custom domain on the same Railway service.

## 2. Point Pterodactyl at a subdomain

Create a DNS record for:

- `panel.hypernode.gg`

Point that subdomain to your VPS public IP.

Use either:

- an `A` record to your IPv4 address
- an `AAAA` record too if your VPS has working IPv6

Do not point the panel to Railway if the panel is still running on your VPS.

## 3. Put SSL in front of the panel

Your panel should load at:

- `https://panel.hypernode.gg`

If you are using Nginx, Caddy, Apache, or another reverse proxy in front of Pterodactyl, make sure:

- the TLS certificate is issued for `panel.hypernode.gg`
- the proxy forwards `Host` and `X-Forwarded-Proto`
- the panel trusts the proxy

On the Pterodactyl panel side, set `TRUSTED_PROXIES` in the panel `.env` when running behind a reverse proxy.

## 4. Make Wings match your SSL setup

If your panel uses SSL, Wings also needs a certificate for the node FQDN used by the panel/node configuration.

Also make sure each Wings node allows your HyperNode app origin for the web console:

- `https://hypernode.gg`
- `https://www.hypernode.gg` if you plan to use `www`

That value lives in `/etc/pterodactyl/config.yml` under `allowed_origins`, then restart Wings.

## 5. Set the HyperNode app URL in Railway

In Railway service variables, set:

```env
NEXT_PUBLIC_APP_URL=https://hypernode.gg
NEXTAUTH_URL=https://hypernode.gg
```

If you want `www.hypernode.gg` to be canonical instead, use that value consistently in both variables.

## 6. Set the Pterodactyl URL inside HyperNode

In HyperNode admin:

- `Admin -> Settings -> Pterodactyl panel`

Set:

```text
PTERODACTYL_URL=https://panel.hypernode.gg
```

Then save your:

- application API key
- client API key for the service account

## 7. Update Stripe webhook URLs

If Stripe is already connected, update the webhook endpoint to:

- `https://hypernode.gg/api/stripe/webhook`

Also make sure Stripe checkout success/cancel flows are using the same live app domain through `NEXT_PUBLIC_APP_URL`.

## 8. Recommended final hostname map

Use this if you want the cleanest setup:

```text
hypernode.gg           -> Railway app
www.hypernode.gg       -> Railway app
panel.hypernode.gg     -> VPS running Pterodactyl panel
```

## 9. Quick verification checklist

- `https://hypernode.gg` loads the site
- login and signup redirect correctly
- `https://panel.hypernode.gg` loads the Pterodactyl panel with a valid certificate
- HyperNode admin can sync nodes/eggs from Pterodactyl
- server console opens without browser CORS/websocket errors
- Stripe webhook shows successful deliveries to the new domain
