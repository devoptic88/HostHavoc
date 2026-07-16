import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { saveArticle } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const article = await db.article.findUnique({ where: { id: params.id } });
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        Edit <span className="text-gradient-hyper">article</span>
      </h1>
      <ContentEditor
        action={saveArticle}
        idField="articleId"
        id={article.id}
        withCategory
        defaults={article}
      />
    </div>
  );
}
