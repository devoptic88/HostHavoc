import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Markdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await db.post
    .findUnique({ where: { slug: params.slug, published: true } })
    .catch(() => null);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/blog" className="text-xs text-steel-faint hover:text-hyper-300">
        ← All posts
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold italic text-white sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-3 text-xs uppercase tracking-wider text-steel-faint">
        {formatDate(post.createdAt)} · HyperNode Team
      </p>
      <div className="mt-10">
        <Markdown>{post.body}</Markdown>
      </div>
    </article>
  );
}
