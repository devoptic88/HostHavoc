import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description: "News, updates, and guides from the HyperNode team.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await db.post
    .findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold italic text-white">
        The <span className="text-gradient-hyper">HyperNode</span> blog
      </h1>
      <p className="mt-3 text-steel-dim">
        Product news, game server updates, and hosting deep dives.
      </p>

      <div className="mt-10 space-y-5">
        {posts.length === 0 && (
          <p className="py-16 text-center text-steel-faint">
            No posts yet — check back soon.
          </p>
        )}
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="block">
            <Card glow>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-steel-faint">
                  {formatDate(post.createdAt)}
                </p>
                <h2 className="mt-2 font-display text-xl font-bold text-white hover:text-hyper-300">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-steel-dim">
                  {post.excerpt}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
