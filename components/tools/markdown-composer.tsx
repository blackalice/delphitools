"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Code2,
  Copy,
  Download,
  Heading1,
  Heading2,
  Link2,
  List,
  ListTodo,
  Quote,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "delphitools-markdown-composer";
const EXAMPLE = `# Markdown Writer

Write on the left and preview on the right.

## Supports

- Headings
- Lists
- Tables
- Task lists
- Code blocks

> Everything stays in your browser.

- [x] Live preview
- [x] Local autosave
- [ ] Publish later

| Tool | Purpose |
| --- | --- |
| Editor | Compose Markdown |
| Preview | Render output |

\`\`\`ts
export const hello = "world";
\`\`\`
`;

export function MarkdownComposerTool() {
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setContent(saved);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, content);
      setSavedAt(new Date());
    }, 400);
    return () => clearTimeout(timer);
  }, [content]);

  const stats = useMemo(() => {
    const trimmed = content.trim();
    return {
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      chars: content.length,
      lines: content ? content.split("\n").length : 0,
    };
  }, [content]);

  const withSelection = (updater: (selected: string) => string, fallback: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || fallback;
    const replacement = updater(selected);
    const next = content.slice(0, start) + replacement + content.slice(end);

    setContent(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    });
  };

  const wrapSelection = (before: string, after = before, fallback = "text") => {
    withSelection((selected) => `${before}${selected}${after}`, fallback);
  };

  const prefixLines = (prefix: string, fallback = "Item") => {
    withSelection(
      (selected) =>
        selected
          .split("\n")
          .map((line) => `${prefix}${line || fallback}`)
          .join("\n"),
      fallback
    );
  };

  const insert = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = content.slice(0, start) + snippet + content.slice(end);

    setContent(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "document.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearContent = () => {
    setContent("");
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setContent(EXAMPLE)}>Load Example</Button>
          <Button variant="outline" size="sm" onClick={() => wrapSelection("# ", "", "Heading")}><Heading1 className="size-4" />H1</Button>
          <Button variant="outline" size="sm" onClick={() => wrapSelection("## ", "", "Heading")}><Heading2 className="size-4" />H2</Button>
          <Button variant="outline" size="sm" onClick={() => wrapSelection("**", "**", "bold text")}>Bold</Button>
          <Button variant="outline" size="sm" onClick={() => wrapSelection("_", "_", "italic text")}>Italic</Button>
          <Button variant="outline" size="sm" onClick={() => wrapSelection("[", "](https://example.com)", "link text")}><Link2 className="size-4" />Link</Button>
          <Button variant="outline" size="sm" onClick={() => prefixLines("> ", "Quoted text")}><Quote className="size-4" />Quote</Button>
          <Button variant="outline" size="sm" onClick={() => prefixLines("- ", "List item")}><List className="size-4" />List</Button>
          <Button variant="outline" size="sm" onClick={() => prefixLines("- [ ] ", "Task item")}><ListTodo className="size-4" />Task</Button>
          <Button variant="outline" size="sm" onClick={() => insert("\n```md\ncode block\n```\n")}><Code2 className="size-4" />Code</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-4">
          <CardHeader className="pb-0">
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Start writing Markdown here..."
              className="min-h-[540px] w-full resize-y rounded-lg border bg-card p-4 font-mono text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader className="pb-0">
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[540px] rounded-lg border bg-card p-5">
              {content.trim() ? (
                <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:bg-muted">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex min-h-[500px] items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
                  Your live preview will appear here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 py-4"><CardContent><div className="text-3xl font-semibold">{stats.words}</div><div className="text-sm text-muted-foreground">Words</div></CardContent></Card>
        <Card className="gap-2 py-4"><CardContent><div className="text-3xl font-semibold">{stats.chars}</div><div className="text-sm text-muted-foreground">Characters</div></CardContent></Card>
        <Card className="gap-2 py-4"><CardContent><div className="text-3xl font-semibold">{stats.lines}</div><div className="text-sm text-muted-foreground">Lines</div></CardContent></Card>
        <Card className="gap-2 py-4">
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Not saved yet"}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyMarkdown}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</Button>
              <Button variant="outline" size="sm" onClick={downloadMarkdown}><Download className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={clearContent}><Trash2 className="size-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
