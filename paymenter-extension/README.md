# HyperNode Paymenter extension

Relays Paymenter's order lifecycle (paid / suspended / unsuspended / cancelled)
into HyperNode. All actual provisioning happens on the HyperNode side
(`src/lib/provision.ts`) — this extension is a thin HTTP relay, nothing more.

## Install

This scaffolding assumes Paymenter's standard extension layout
(`php artisan app:extension:create`, type "Server"). Exact file locations may
differ by Paymenter version — check `php artisan app:extension:create --help`
on your instance if this doesn't match.

1. On the Paymenter server, scaffold a new server extension:
   ```
   php artisan app:extension:create
   ```
   Name it `HyperNode` when prompted.
2. Replace the generated extension class with [`src/HyperNode.php`](src/HyperNode.php)
   from this folder (adjust the namespace if the scaffold generated a
   different one — keep whatever `php artisan` generated, just port over the
   `getConfig`/`getProductConfig`/`createServer`/`suspendServer`/
   `unsuspendServer`/`terminateServer` methods).
3. Enable the extension in Paymenter Admin → Extensions.
4. Configure it:
   - **HyperNode URL** — the deployed HyperNode app's base URL.
   - **Extension shared secret** — any random string. Enter the *same* value
     in HyperNode's Admin → Settings → Paymenter billing →
     "Extension shared secret" (`PAYMENTER_EXTENSION_SECRET`).
5. Assign this extension as the "server type" on every Paymenter product that
   corresponds to a HyperNode plan — HyperNode creates those products lazily
   via its admin API on first checkout (`findOrCreatePaymenterProduct` in
   `src/lib/paymenter.ts`), so this is a one-time step per plan after it's
   first purchased (or pre-create products manually).

## How the two sides connect

- HyperNode's own `/checkout` collects everything (server name, game, plan,
  Rust profile, Minecraft EULA, etc.) and creates a local `Order` row.
- It then calls Paymenter's admin API to create a Paymenter order for that
  customer/product, stamping `hypernode_order_id` as order metadata, and
  redirects the customer to Paymenter to pay.
- Once paid, Paymenter calls this extension's `createServer()`, which reads
  `hypernode_order_id` back off the order and POSTs to
  `{HYPERNODE_URL}/api/paymenter/provision` with header
  `X-Paymenter-Secret: <shared secret>`. HyperNode looks up the order and runs
  its existing `provisionOrder()` — unchanged from before this integration.
- `suspendServer` / `unsuspendServer` / `terminateServer` follow the same
  pattern against `/api/paymenter/suspend`, `/unsuspend`, `/terminate`.

## Verification note

Field names for Paymenter's admin API (`/api/v1/admin/...`) and the exact
metadata mechanism for stamping `hypernode_order_id` onto an order were built
from Paymenter's documented shape, not confirmed against a live instance —
double check `src/lib/paymenter.ts` on the HyperNode side and this extension's
`hypernodeOrderId()` lookup against your actual Paymenter version's API
responses before going live, and adjust field names in one place if they
don't match.
