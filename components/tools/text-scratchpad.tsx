"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Copy,
  Check,
  Trash2,
  CaseSensitive,
  ArrowUpDown,
  Sparkles,
  Search,
  FileText,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "delphitools-scratchpad";

function ToolButton({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Button onClick={onClick} title={title} variant="outline" size="sm">
      {children}
    </Button>
  );
}

function PanelHeader({
  active,
  id,
  icon: Icon,
  label,
  onToggle,
}: {
  active: boolean;
  id: string;
  icon: React.ElementType;
  label: string;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(id)}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
        active ? "bg-primary/10 text-primary" : "hover:bg-muted"
      }`}
    >
      <Icon className="size-4" />
      <span className="text-sm font-medium">{label}</span>
      <ChevronDown className={`ml-1 size-3 transition-transform ${active ? "rotate-180" : ""}`} />
    </button>
  );
}

export function TextScratchpadTool() {
  const [content, setContent] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [extractedItems, setExtractedItems] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (content) {
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, content);
        setLastSaved(new Date());
      }, 1000);
      return () => clearTimeout(timer);
    }

    localStorage.removeItem(STORAGE_KEY);
  }, [content]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const lineCount = content ? content.split("\n").length : 0;

  const copyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadContent = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "scratchpad.txt";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearContent = () => {
    if (confirm("Clear all content?")) {
      setContent("");
      setLastSaved(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const toUpperCase = () => setContent(content.toUpperCase());
  const toLowerCase = () => setContent(content.toLowerCase());
  const toTitleCase = () =>
    setContent(
      content.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())
    );
  const toSentenceCase = () =>
    setContent(content.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (char) => char.toUpperCase()));
  const toCamelCase = () =>
    setContent(content.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase()));
  const toSnakeCase = () =>
    setContent(
      content
        .replace(/\s+/g, "_")
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
    );
  const toKebabCase = () =>
    setContent(
      content
        .replace(/\s+/g, "-")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
    );

  const sortLines = () => setContent(content.split("\n").sort((a, b) => a.localeCompare(b)).join("\n"));
  const sortLinesReverse = () =>
    setContent(content.split("\n").sort((a, b) => b.localeCompare(a)).join("\n"));
  const sortByLength = () => setContent(content.split("\n").sort((a, b) => a.length - b.length).join("\n"));
  const reverseLines = () => setContent(content.split("\n").reverse().join("\n"));
  const shuffleLines = () => {
    const lines = content.split("\n");
    for (let index = lines.length - 1; index > 0; index -= 1) {
      const nextIndex = Math.floor(Math.random() * (index + 1));
      [lines[index], lines[nextIndex]] = [lines[nextIndex], lines[index]];
    }
    setContent(lines.join("\n"));
  };
  const removeDuplicates = () => setContent([...new Set(content.split("\n"))].join("\n"));
  const addLineNumbers = () =>
    setContent(
      content
        .split("\n")
        .map((line, index) => `${index + 1}. ${line}`)
        .join("\n")
    );
  const removeLineNumbers = () =>
    setContent(content.split("\n").map((line) => line.replace(/^\d+[\.\):\-]\s*/, "")).join("\n"));

  const trimWhitespace = () => setContent(content.split("\n").map((line) => line.trim()).join("\n"));
  const removeEmptyLines = () => setContent(content.split("\n").filter((line) => line.trim()).join("\n"));
  const removeLineBreaks = () => setContent(content.replace(/\n+/g, " ").replace(/\s+/g, " ").trim());
  const addLineBreaks = (width = 80) => {
    const words = content.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += `${currentLine ? " " : ""}${word}`;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    setContent(lines.join("\n"));
  };
  const removeExtraSpaces = () => setContent(content.replace(/[^\S\n]+/g, " "));
  const decodeUrlChars = () => {
    try {
      setContent(decodeURIComponent(content));
    } catch {
      alert("Unable to decode. Text may contain invalid percent-encoded sequences.");
    }
  };
  const encodeUrlChars = () => setContent(encodeURIComponent(content));

  const doReplace = (replaceAll: boolean) => {
    if (!findText) return;

    try {
      if (useRegex) {
        const regex = new RegExp(findText, replaceAll ? "g" : "");
        setContent(content.replace(regex, replaceText));
        return;
      }

      if (replaceAll) {
        setContent(content.split(findText).join(replaceText));
      } else {
        setContent(content.replace(findText, replaceText));
      }
    } catch {
      alert("Invalid regex pattern");
    }
  };

  const countMatches = () => {
    if (!findText) return 0;

    try {
      if (useRegex) {
        const regex = new RegExp(findText, "g");
        return (content.match(regex) || []).length;
      }

      return content.split(findText).length - 1;
    } catch {
      return 0;
    }
  };

  const extractEmails = () => {
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    setExtractedItems([...new Set(emails)]);
  };

  const extractUrls = () => {
    const urls = content.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
    setExtractedItems([...new Set(urls)]);
  };

  const extractNumbers = () => {
    const numbers = content.match(/-?\d+\.?\d*/g) || [];
    setExtractedItems([...new Set(numbers)]);
  };

  const copyExtracted = async () => {
    await navigator.clipboard.writeText(extractedItems.join("\n"));
  };

  const togglePanel = (id: string) => {
    setActivePanel(activePanel === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <PanelHeader active={activePanel === "case"} id="case" icon={CaseSensitive} label="Case" onToggle={togglePanel} />
        <PanelHeader active={activePanel === "lines"} id="lines" icon={ArrowUpDown} label="Lines" onToggle={togglePanel} />
        <PanelHeader active={activePanel === "cleanup"} id="cleanup" icon={Sparkles} label="Clean Up" onToggle={togglePanel} />
        <PanelHeader active={activePanel === "find"} id="find" icon={Search} label="Find & Replace" onToggle={togglePanel} />
        <PanelHeader active={activePanel === "extract"} id="extract" icon={FileText} label="Extract" onToggle={togglePanel} />
      </div>

      {activePanel === "case" && (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3">
          <ToolButton onClick={toUpperCase}>UPPERCASE</ToolButton>
          <ToolButton onClick={toLowerCase}>lowercase</ToolButton>
          <ToolButton onClick={toTitleCase}>Title Case</ToolButton>
          <ToolButton onClick={toSentenceCase}>Sentence case</ToolButton>
          <ToolButton onClick={toCamelCase}>camelCase</ToolButton>
          <ToolButton onClick={toSnakeCase}>snake_case</ToolButton>
          <ToolButton onClick={toKebabCase}>kebab-case</ToolButton>
        </div>
      )}

      {activePanel === "lines" && (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3">
          <ToolButton onClick={sortLines}>Sort A-Z</ToolButton>
          <ToolButton onClick={sortLinesReverse}>Sort Z-A</ToolButton>
          <ToolButton onClick={sortByLength}>Sort by Length</ToolButton>
          <ToolButton onClick={reverseLines}>Reverse Order</ToolButton>
          <ToolButton onClick={shuffleLines}>Shuffle</ToolButton>
          <ToolButton onClick={removeDuplicates}>Remove Duplicates</ToolButton>
          <ToolButton onClick={addLineNumbers}>Add Line Numbers</ToolButton>
          <ToolButton onClick={removeLineNumbers}>Remove Line Numbers</ToolButton>
        </div>
      )}

      {activePanel === "cleanup" && (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3">
          <ToolButton onClick={trimWhitespace}>Trim Lines</ToolButton>
          <ToolButton onClick={removeEmptyLines}>Remove Empty Lines</ToolButton>
          <ToolButton onClick={removeExtraSpaces}>Remove Extra Spaces</ToolButton>
          <ToolButton onClick={removeLineBreaks}>Join Lines</ToolButton>
          <ToolButton onClick={() => addLineBreaks(80)}>Wrap at 80</ToolButton>
          <ToolButton onClick={() => addLineBreaks(120)}>Wrap at 120</ToolButton>
          <ToolButton onClick={encodeUrlChars} title="Encode special characters (for example / -> %2F)">
            Encode URL
          </ToolButton>
          <ToolButton onClick={decodeUrlChars} title="Decode %XX characters (for example %2F -> /)">
            Decode URL
          </ToolButton>
        </div>
      )}

      {activePanel === "find" && (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={findText}
              onChange={(event) => setFindText(event.target.value)}
              placeholder="Find..."
              className="min-w-[150px] flex-1"
            />
            <Input
              value={replaceText}
              onChange={(event) => setReplaceText(event.target.value)}
              placeholder="Replace with..."
              className="min-w-[150px] flex-1"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(event) => setUseRegex(event.target.checked)}
                className="rounded"
              />
              Use Regex
            </label>
            {findText && <span className="text-sm text-muted-foreground">{countMatches()} matches</span>}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => doReplace(false)}>
                Replace
              </Button>
              <Button size="sm" onClick={() => doReplace(true)}>
                Replace All
              </Button>
            </div>
          </div>
        </div>
      )}

      {activePanel === "extract" && (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap gap-2">
            <ToolButton onClick={extractEmails}>Extract Emails</ToolButton>
            <ToolButton onClick={extractUrls}>Extract URLs</ToolButton>
            <ToolButton onClick={extractNumbers}>Extract Numbers</ToolButton>
          </div>
          {extractedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Found {extractedItems.length} items</span>
                <Button size="sm" variant="ghost" onClick={copyExtracted}>
                  <Copy className="mr-1 size-3" />
                  Copy All
                </Button>
              </div>
              <div className="max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-sm">
                {extractedItems.map((item, index) => (
                  <div key={index} className="truncate">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Start typing or paste text here..."
        className="min-h-[500px] w-full resize-y rounded-lg border bg-card p-4 font-mono text-base leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && <span className="text-muted-foreground/60">Saved {lastSaved.toLocaleTimeString()}</span>}
          <Button size="sm" variant="ghost" onClick={copyContent}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={downloadContent}>
            <Download className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={clearContent}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
