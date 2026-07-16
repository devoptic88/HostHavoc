import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Markdown } from "@/lib/markdown";
import { GAMES } from "@/content/games";

export const dynamic = "force-dynamic";

export default async function WikiArticlePage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const article = await db.article
    .findUnique({ where: { slug: params.slug, published: true } })
    .catch(() => null);
  if (!article || article.category !== params.category) notFound();

  const game = GAMES.find((g) => g.slug === article.category);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="text-xs text-steel-faint">
        <Link href="/wiki" className="hover:text-hyper-300">
          Knowledgebase
        </Link>
        {game && (
          <>
            {" / "}
            <Link href={`/game-servers/${game.slug}`} className="hover:text-hyper-300">
              {game.name}
            </Link>
          </>
        )}
      </nav>
      <h1 className="mt-4 font-display text-3xl font-extrabold italic text-white">
        {article.title}
      </h1>
      <div className="mt-8">
        <Markdown>{article.body}</Markdown>
      </div>
      {game && (
        <div className="glass mt-12 rounded-2xl p-6 text-center">
          <p className="text-sm text-steel-dim">
            Don&apos;t have a {game.name} server yet?
          </p>
          <Link
            href={`/game-servers/${game.slug}`}
            className="mt-2 inline-block font-semibold text-hyper-300 hover:text-hyper-200"
          >
            Deploy one in minutes →
          </Link>
        </div>
      )}
    </article>
  );
}
