"use client";

import { useMemo, useState } from "react";
import { Check, Copy, RotateCcw, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type CompareOptions = {
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
};

type DiffOp =
  | { type: "equal"; line: string; lineNumber: number }
  | { type: "remove"; line: string; lineNumber: number }
  | { type: "add"; line: string; lineNumber: number };

type DiffRow =
  | {
      kind: "equal";
      leftLine: string;
      rightLine: string;
      leftNumber: number;
      rightNumber: number;
    }
  | {
      kind: "remove";
      leftLine: string;
      leftNumber: number;
    }
  | {
      kind: "add";
      rightLine: string;
      rightNumber: number;
    }
  | {
      kind: "modify" | "whitespace";
      leftLine: string;
      rightLine: string;
      leftNumber: number;
      rightNumber: number;
    };

const EXAMPLE_LEFT = `Hello world
This line has two spaces
Keep this paragraph.
Remove this line
Case Sensitive
Final line`;

const EXAMPLE_RIGHT = `Hello world
This line has  two spaces
Keep this paragraph, please.
Case sensitive
Add this line
Final line`;

function splitLines(text: string) {
  return text ? text.split(/\r?\n/) : [];
}

function normalizeLine(line: string, options: CompareOptions) {
  let normalized = line;

  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, " ").trim();
  }

  if (options.ignoreCase) {
    normalized = normalized.toLocaleLowerCase();
  }

  return normalized;
}

function areLinesEqual(left: string, right: string, options: CompareOptions) {
  return normalizeLine(left, options) === normalizeLine(right, options);
}

function isWhitespaceOnlyChange(left: string, right: string) {
  return left !== right && left.replace(/\s+/g, " ").trim() === right.replace(/\s+/g, " ").trim();
}

function buildDiffOps(leftText: string, rightText: string, options: CompareOptions) {
  const leftLines = splitLines(leftText);
  const rightLines = splitLines(rightText);
  const leftComparable = leftLines.map((line) => normalizeLine(line, options));
  const rightComparable = rightLines.map((line) => normalizeLine(line, options));

  const matrix = Array.from({ length: leftLines.length + 1 }, () =>
    Array<number>(rightLines.length + 1).fill(0)
  );

  for (let leftIndex = 1; leftIndex <= leftLines.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= rightLines.length; rightIndex += 1) {
      if (leftComparable[leftIndex - 1] === rightComparable[rightIndex - 1]) {
        matrix[leftIndex][rightIndex] = matrix[leftIndex - 1][rightIndex - 1] + 1;
      } else {
        matrix[leftIndex][rightIndex] = Math.max(
          matrix[leftIndex - 1][rightIndex],
          matrix[leftIndex][rightIndex - 1]
        );
      }
    }
  }

  const reversedOps: DiffOp[] = [];
  let leftIndex = leftLines.length;
  let rightIndex = rightLines.length;

  while (leftIndex > 0 || rightIndex > 0) {
    if (
      leftIndex > 0 &&
      rightIndex > 0 &&
      leftComparable[leftIndex - 1] === rightComparable[rightIndex - 1]
    ) {
      reversedOps.push({
        type: "equal",
        line: leftLines[leftIndex - 1],
        lineNumber: leftIndex,
      });
      leftIndex -= 1;
      rightIndex -= 1;
    } else if (
      rightIndex > 0 &&
      (leftIndex === 0 || matrix[leftIndex][rightIndex - 1] >= matrix[leftIndex - 1][rightIndex])
    ) {
      reversedOps.push({
        type: "add",
        line: rightLines[rightIndex - 1],
        lineNumber: rightIndex,
      });
      rightIndex -= 1;
    } else {
      reversedOps.push({
        type: "remove",
        line: leftLines[leftIndex - 1],
        lineNumber: leftIndex,
      });
      leftIndex -= 1;
    }
  }

  return reversedOps.reverse();
}

function buildDiffRows(leftText: string, rightText: string, options: CompareOptions) {
  const ops = buildDiffOps(leftText, rightText, options);
  const rows: DiffRow[] = [];
  let index = 0;

  while (index < ops.length) {
    const op = ops[index];

    if (op.type === "equal") {
      rows.push({
        kind: "equal",
        leftLine: op.line,
        rightLine: op.line,
        leftNumber: op.lineNumber,
        rightNumber: op.lineNumber,
      });
      index += 1;
      continue;
    }

    const removed: Array<Extract<DiffOp, { type: "remove" }>> = [];
    const added: Array<Extract<DiffOp, { type: "add" }>> = [];

    while (index < ops.length && ops[index].type !== "equal") {
      const current = ops[index];
      if (current.type === "remove") {
        removed.push(current);
      } else if (current.type === "add") {
        added.push(current);
      }
      index += 1;
    }

    const pairCount = Math.max(removed.length, added.length);
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      const left = removed[pairIndex];
      const right = added[pairIndex];

      if (left && right) {
        rows.push({
          kind: isWhitespaceOnlyChange(left.line, right.line) ? "whitespace" : "modify",
          leftLine: left.line,
          rightLine: right.line,
          leftNumber: left.lineNumber,
          rightNumber: right.lineNumber,
        });
      } else if (left) {
        rows.push({
          kind: "remove",
          leftLine: left.line,
          leftNumber: left.lineNumber,
        });
      } else if (right) {
        rows.push({
          kind: "add",
          rightLine: right.line,
          rightNumber: right.lineNumber,
        });
      }
    }
  }

  return rows;
}

function formatLineForDisplay(line: string, showWhitespace: boolean) {
  if (!line.length) {
    return null;
  }

  if (!showWhitespace) {
    return line;
  }

  return line.replace(/ /g, "·\u200b").replace(/\t/g, "⇥\u200b");
}

function buildReport(rows: DiffRow[]) {
  if (!rows.length) {
    return "No content to compare.";
  }

  return rows
    .filter((row) => row.kind !== "equal")
    .map((row) => {
      if (row.kind === "add") {
        return `+ R${row.rightNumber}: ${row.rightLine}`;
      }

      if (row.kind === "remove") {
        return `- L${row.leftNumber}: ${row.leftLine}`;
      }

      return `${row.kind === "whitespace" ? "≈" : "~"} L${row.leftNumber} -> R${row.rightNumber}: ${row.leftLine} => ${row.rightLine}`;
    })
    .join("\n");
}

function DiffLine({
  line,
  lineNumber,
  variant,
  showWhitespace,
}: {
  line?: string;
  lineNumber?: number;
  variant: "equal" | "add" | "remove" | "modify" | "whitespace" | "empty";
  showWhitespace: boolean;
}) {
  const formattedLine = line ? formatLineForDisplay(line, showWhitespace) : null;

  return (
    <div
      className={cn(
        "grid min-h-11 grid-cols-[3rem,1fr] border-b last:border-b-0",
        variant === "equal" && "bg-background",
        variant === "add" && "bg-emerald-500/8",
        variant === "remove" && "bg-rose-500/8",
        variant === "modify" && "bg-amber-500/8",
        variant === "whitespace" && "bg-sky-500/8",
        variant === "empty" && "bg-muted/20"
      )}
    >
      <div className="border-r px-3 py-2 text-right font-mono text-xs text-muted-foreground">
        {lineNumber ?? ""}
      </div>
      <div
        className={cn(
          "px-3 py-2 font-mono text-sm whitespace-pre-wrap",
          showWhitespace ? "break-all" : "break-words"
        )}
      >
        {formattedLine ?? (
          <span className="text-muted-foreground/60 italic">
            {line === "" ? "Blank line" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function DiffRowView({
  row,
  showWhitespace,
}: {
  row: DiffRow;
  showWhitespace: boolean;
}) {
  if (row.kind === "equal") {
    return (
      <div className="grid gap-px bg-border lg:grid-cols-2">
        <DiffLine
          line={row.leftLine}
          lineNumber={row.leftNumber}
          showWhitespace={showWhitespace}
          variant="equal"
        />
        <DiffLine
          line={row.rightLine}
          lineNumber={row.rightNumber}
          showWhitespace={showWhitespace}
          variant="equal"
        />
      </div>
    );
  }

  if (row.kind === "remove") {
    return (
      <div className="grid gap-px bg-border lg:grid-cols-2">
        <DiffLine
          line={row.leftLine}
          lineNumber={row.leftNumber}
          showWhitespace={showWhitespace}
          variant="remove"
        />
        <DiffLine showWhitespace={showWhitespace} variant="empty" />
      </div>
    );
  }

  if (row.kind === "add") {
    return (
      <div className="grid gap-px bg-border lg:grid-cols-2">
        <DiffLine showWhitespace={showWhitespace} variant="empty" />
        <DiffLine
          line={row.rightLine}
          lineNumber={row.rightNumber}
          showWhitespace={showWhitespace}
          variant="add"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-px bg-border lg:grid-cols-2">
      <DiffLine
        line={row.leftLine}
        lineNumber={row.leftNumber}
        showWhitespace={showWhitespace}
        variant={row.kind}
      />
      <DiffLine
        line={row.rightLine}
        lineNumber={row.rightNumber}
        showWhitespace={showWhitespace}
        variant={row.kind}
      />
    </div>
  );
}

export function DiffCheckerTool() {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [copied, setCopied] = useState(false);

  const options = useMemo(
    () => ({
      ignoreCase,
      ignoreWhitespace,
    }),
    [ignoreCase, ignoreWhitespace]
  );

  const rows = useMemo(
    () => buildDiffRows(leftText, rightText, options),
    [leftText, rightText, options]
  );

  const changedRows = useMemo(
    () => rows.filter((row) => row.kind !== "equal"),
    [rows]
  );

  const summary = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        if (row.kind === "equal") accumulator.same += 1;
        if (row.kind === "add") accumulator.added += 1;
        if (row.kind === "remove") accumulator.removed += 1;
        if (row.kind === "modify") accumulator.modified += 1;
        if (row.kind === "whitespace") accumulator.whitespace += 1;
        return accumulator;
      },
      { same: 0, added: 0, removed: 0, modified: 0, whitespace: 0 }
    );
  }, [rows]);

  const copyReport = async () => {
    await navigator.clipboard.writeText(buildReport(rows));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const loadExample = () => {
    setLeftText(EXAMPLE_LEFT);
    setRightText(EXAMPLE_RIGHT);
  };

  const swapSides = () => {
    setLeftText(rightText);
    setRightText(leftText);
  };

  const clearAll = () => {
    setLeftText("");
    setRightText("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={loadExample} variant="outline">
          Load Example
        </Button>
        <Button onClick={swapSides} variant="outline">
          <Shuffle className="mr-2 size-4" />
          Swap Sides
        </Button>
        <Button onClick={clearAll} variant="outline">
          <RotateCcw className="mr-2 size-4" />
          Clear
        </Button>
        <Button onClick={copyReport} variant="outline">
          {copied ? (
            <>
              <Check className="mr-2 size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-2 size-4" />
              Copy Report
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Comparison Options</CardTitle>
          <CardDescription>
            Toggle comparison rules without changing the original text on either side.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="text-sm font-medium">Ignore case</span>
            <Switch checked={ignoreCase} onCheckedChange={setIgnoreCase} />
          </label>
          <label className="flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="text-sm font-medium">Ignore whitespace</span>
            <Switch checked={ignoreWhitespace} onCheckedChange={setIgnoreWhitespace} />
          </label>
          <label className="flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="text-sm font-medium">Show whitespace</span>
            <Switch checked={showWhitespace} onCheckedChange={setShowWhitespace} />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-4">
          <CardHeader className="pb-0">
            <CardTitle>Left</CardTitle>
            <CardDescription>Original or previous version</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="min-h-[260px] w-full rounded-lg border bg-background p-4 font-mono text-sm leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setLeftText(event.target.value)}
              placeholder="Paste the first text block here..."
              value={leftText}
            />
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader className="pb-0">
            <CardTitle>Right</CardTitle>
            <CardDescription>Updated or comparison version</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="min-h-[260px] w-full rounded-lg border bg-background p-4 font-mono text-sm leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setRightText(event.target.value)}
              placeholder="Paste the second text block here..."
              value={rightText}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="gap-2 py-4">
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold">{summary.same}</div>
            <div className="text-sm text-muted-foreground">Unchanged lines</div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold">{summary.modified}</div>
            <div className="text-sm text-muted-foreground">Changed lines</div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold">{summary.whitespace}</div>
            <div className="text-sm text-muted-foreground">Whitespace-only changes</div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold">{summary.added}</div>
            <div className="text-sm text-muted-foreground">Added lines</div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold">{summary.removed}</div>
            <div className="text-sm text-muted-foreground">Removed lines</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Diff Output</CardTitle>
          <CardDescription>
            Side-by-side line comparison with additions, removals, and modified pairs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="changes">
            <TabsList>
              <TabsTrigger value="changes">
                Changes ({changedRows.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                Full Diff ({rows.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="changes">
              {changedRows.length > 0 ? (
                <div className="overflow-hidden rounded-xl border">
                  <div className="grid gap-px bg-border text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid-cols-2">
                    <div className="bg-muted px-4 py-3">Left</div>
                    <div className="bg-muted px-4 py-3">Right</div>
                  </div>
                  {changedRows.map((row, index) => (
                    <DiffRowView key={`${row.kind}-${index}`} row={row} showWhitespace={showWhitespace} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
                  No differences detected under the current comparison rules.
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {rows.length > 0 ? (
                <div className="overflow-hidden rounded-xl border">
                  <div className="grid gap-px bg-border text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid-cols-2">
                    <div className="bg-muted px-4 py-3">Left</div>
                    <div className="bg-muted px-4 py-3">Right</div>
                  </div>
                  {rows.map((row, index) => (
                    <DiffRowView key={`${row.kind}-all-${index}`} row={row} showWhitespace={showWhitespace} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
                  Paste text into either side to start comparing.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
