import { ContentEditor } from "@/components/admin/ContentEditor";
import { savePost } from "../../actions";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        New <span className="text-gradient-hyper">post</span>
      </h1>
      <ContentEditor action={savePost} idField="postId" withExcerpt />
    </div>
  );
}
