import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { savePost } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const post = await db.post.findUnique({ where: { id: params.id } });
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        Edit <span className="text-gradient-hyper">post</span>
      </h1>
      <ContentEditor
        action={savePost}
        idField="postId"
        id={post.id}
        withExcerpt
        defaults={post}
      />
    </div>
  );
}
