import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { deleteArticle } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminWikiPage() {
  const articles = await db.article.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold italic text-white">
          <span className="text-gradient-hyper">Wiki</span> articles
        </h1>
        <ButtonLink href="/admin/wiki/new" size="sm">New article</ButtonLink>
      </div>
      <div className="space-y-3">
        {articles.length === 0 && (
          <Card>
            <CardBody className="py-14 text-center text-sm text-steel-faint">
              No articles yet.
            </CardBody>
          </Card>
        )}
        {articles.map((a) => (
          <Card key={a.id}>
            <CardBody className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/wiki/${a.id}`} className="font-semibold text-white hover:text-hyper-300">
                  {a.title}
                </Link>
                <p className="text-xs text-steel-faint">/wiki/{a.category}/{a.slug}</p>
              </div>
              <Badge tone="blue">{a.category}</Badge>
              {a.published ? <Badge tone="green">Published</Badge> : <Badge tone="steel">Draft</Badge>}
              <form action={deleteArticle}>
                <input type="hidden" name="articleId" value={a.id} />
                <Button size="sm" variant="ghost" type="submit">Delete</Button>
              </form>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
