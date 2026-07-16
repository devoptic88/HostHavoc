import { marked } from "marked";

export function Markdown({ children }: { children: string }) {
  const html = marked.parse(children, { async: false }) as string;
  return (
    <div
      className="prose-hypernode"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
