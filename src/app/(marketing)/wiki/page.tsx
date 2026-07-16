import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { GAMES } from "@/content/games";

export const metadata: Metadata = {
  title: "Knowledgebase",
  description:
    "Guides and tutorials for every game HyperNode hosts — connection guides, mod installs, config tuning, and more.",
};

export const dynamic = "force-dynamic";

export default async function WikiPage() {
  const articles = await db.article
    .findMany({
      where: { published: true },
      orderBy: { title: "asc" },
    })
    .catch(() => []);

  const categories = new Map<string, typeof articles>();
  for (const a of articles) {
    const list = categories.get(a.category) ?? [];
    list.push(a);
    categories.set(a.category, list);
  }

  const categoryLabel = (cat: string) =>
    GAMES.find((g) => g.slug === cat)?.name ??
    cat.charAt(0).toUpperCase() + cat.slice(1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl font-extrabold italic text-white">
          <span className="text-gradient-hyper">Knowledge</span>base
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-steel-dim">
          Step-by-step guides for every game and service we host.
        </p>
      </div>

      {categories.size === 0 && (
        <p className="py-16 text-center text-steel-faint">
          Articles are being written — check back soon.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from(categories.entries()).map(([cat, list]) => (
          <Card key={cat}>
            <CardBody>
              <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-white">
                <BookOpen className="h-4 w-4 text-hyper-400" />
                {categoryLabel(cat)}
              </h2>
              <ul className="space-y-2">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/wiki/${a.category}/${a.slug}`}
                      className="text-sm text-steel-dim transition-colors hover:text-hyper-300"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
