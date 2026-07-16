import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { deletePost } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = await db.post.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold italic text-white">
          <span className="text-gradient-hyper">Blog</span> posts
        </h1>
        <ButtonLink href="/admin/blog/new" size="sm">New post</ButtonLink>
      </div>
      <div className="space-y-3">
        {posts.length === 0 && (
          <Card>
            <CardBody className="py-14 text-center text-sm text-steel-faint">
              No posts yet — write your launch announcement!
            </CardBody>
          </Card>
        )}
        {posts.map((p) => (
          <Card key={p.id}>
            <CardBody className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/blog/${p.id}`} className="font-semibold text-white hover:text-hyper-300">
                  {p.title}
                </Link>
                <p className="text-xs text-steel-faint">
                  /blog/{p.slug} · {formatDate(p.createdAt)}
                </p>
              </div>
              {p.published ? <Badge tone="green">Published</Badge> : <Badge tone="steel">Draft</Badge>}
              <form action={deletePost}>
                <input type="hidden" name="postId" value={p.id} />
                <Button size="sm" variant="ghost" type="submit">Delete</Button>
              </form>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
