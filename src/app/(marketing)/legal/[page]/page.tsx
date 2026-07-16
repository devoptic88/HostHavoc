import { notFound } from "next/navigation";
import { Markdown } from "@/lib/markdown";

const PAGES: Record<string, { title: string; body: string }> = {
  terms: {
    title: "Terms of Service",
    body: `
## 1. Services

HyperNode provides game server, VPS, and dedicated server hosting on a month-to-month basis. Services activate automatically upon successful payment and renew monthly until cancelled.

## 2. Acceptable Use

You may not use HyperNode services to host illegal content, launch attacks against other networks, send unsolicited bulk mail, or run cryptocurrency miners on game server plans. We reserve the right to suspend services that endanger platform stability or other customers.

## 3. Payments & Refunds

All plans bill monthly in advance. New services are covered by a 72-hour money-back guarantee. After 72 hours, cancellations stop future billing but are not refunded pro-rata.

## 4. Cancellation

You may cancel any service at any time from the billing dashboard. Cancelled services remain active until the end of the paid period, after which data is retained for 7 days and then permanently deleted.

## 5. Liability

Services are provided "as is". HyperNode's total liability is limited to the fees paid in the preceding 30 days. We are not liable for loss of data, revenue, or community members — keep backups enabled.
`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `
## What we collect

Account details (name, email), billing metadata processed by Stripe (we never see or store full card numbers), and operational data about your services (server names, resource usage, support tickets).

## What we don't do

We do not sell your data, run third-party ad trackers, or read the contents of your servers except when you explicitly ask support to investigate an issue.

## Payment processing

All payments are processed by Stripe. Card details go directly from your browser to Stripe and never touch HyperNode infrastructure.

## Data retention

Service data is deleted 7 days after service termination. Account and invoice records are retained as required for tax and accounting purposes.

## Contact

Privacy questions: open a support ticket or email privacy@hypernode.gg.
`,
  },
  sla: {
    title: "SLA & Guarantee",
    body: `
## Uptime guarantee

We target 99.9% uptime on game servers and VPS, and 100% power/network uptime on dedicated servers. Unplanned downtime beyond these thresholds earns account credit on request: 5% of the monthly fee per full hour of downtime, up to 100% of the month.

## Money-back guarantee

Every new service includes a 72-hour money-back guarantee — if HyperNode isn't for you, open a ticket within 72 hours of activation for a full refund. No forms, no hoops.

## Maintenance

Planned maintenance is announced at least 48 hours ahead on the status page and via email. Planned windows are excluded from SLA calculations.
`,
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export function generateMetadata({ params }: { params: { page: string } }) {
  const page = PAGES[params.page];
  return page ? { title: page.title } : {};
}

export default function LegalPage({ params }: { params: { page: string } }) {
  const page = PAGES[params.page];
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold italic text-white">
        {page.title}
      </h1>
      <p className="mt-2 text-xs text-steel-faint">Last updated: July 2026</p>
      <div className="mt-8">
        <Markdown>{page.body}</Markdown>
      </div>
    </div>
  );
}
