import { ContentEditor } from "@/components/admin/ContentEditor";
import { saveArticle } from "../../actions";

export default function NewArticlePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        New <span className="text-gradient-hyper">article</span>
      </h1>
      <ContentEditor action={saveArticle} idField="articleId" withCategory />
    </div>
  );
}
