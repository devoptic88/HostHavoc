import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

export function ContentEditor({
  action,
  idField,
  id,
  defaults,
  withCategory,
  withExcerpt,
}: {
  action: (formData: FormData) => Promise<void>;
  idField: string;
  id?: string;
  defaults?: {
    title?: string;
    excerpt?: string;
    category?: string;
    body?: string;
    published?: boolean;
  };
  withCategory?: boolean;
  withExcerpt?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <form action={action} className="space-y-4">
          {id && <input type="hidden" name={idField} value={id} />}
          <div>
            <Label>Title</Label>
            <Input name="title" required defaultValue={defaults?.title} />
          </div>
          {withExcerpt && (
            <div>
              <Label>Excerpt</Label>
              <Input name="excerpt" defaultValue={defaults?.excerpt} maxLength={300} />
            </div>
          )}
          {withCategory && (
            <div>
              <Label>Category (game slug or &quot;general&quot;)</Label>
              <Input name="category" defaultValue={defaults?.category ?? "general"} />
            </div>
          )}
          <div>
            <Label>Body (Markdown)</Label>
            <Textarea name="body" required defaultValue={defaults?.body} className="min-h-[320px] font-mono text-xs" />
          </div>
          <label className="flex items-center gap-2 text-sm text-steel-dim">
            <input
              type="checkbox"
              name="published"
              defaultChecked={defaults?.published ?? true}
              className="accent-hyper-500"
            />
            Published
          </label>
          <Button type="submit">{id ? "Save changes" : "Create"}</Button>
        </form>
      </CardBody>
    </Card>
  );
}
