import { useState } from "react";
import { Info, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COURSE_JSON_SCHEMA_DOC, AI_PROMPT_TEMPLATE } from "@/lib/course-import-schema";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

export function CourseImportInfoDialog() {
  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <Info className="size-3.5 text-muted-foreground" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>How to create a course JSON</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Course Import JSON Schema</DialogTitle>
          <DialogDescription>
            Use this schema to create a course JSON file manually or with any AI tool.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Schema reference */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">JSON Schema</h3>
              <CopyButton text={COURSE_JSON_SCHEMA_DOC} label="Copy Schema" />
            </div>
            <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre leading-relaxed max-h-80 overflow-y-auto">
              {COURSE_JSON_SCHEMA_DOC}
            </pre>
          </section>

          {/* Quick rules */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Rules</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              <li>
                <code className="text-foreground">format</code> must be exactly{" "}
                <code className="text-foreground">"learnerverse-course-export"</code>
              </li>
              <li>
                <code className="text-foreground">version</code> must be{" "}
                <code className="text-foreground">1</code>
              </li>
              <li>
                Three lesson types: <code className="text-foreground">video</code>,{" "}
                <code className="text-foreground">note</code>,{" "}
                <code className="text-foreground">quiz</code>
              </li>
              <li>Quiz questions need exactly 4 options and a correct_option index (0-3)</li>
              <li>Max 50 sections, 500 total lessons, 10 tags</li>
              <li>All URLs must be http:// or https://</li>
              <li>File size limit: 5 MB</li>
            </ul>
          </section>

          {/* AI prompt template */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">AI Prompt Template</h3>
              <CopyButton text={AI_PROMPT_TEMPLATE} label="Copy Prompt" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Copy this prompt and paste it into ChatGPT, Claude, or any AI to generate a valid
              course JSON. Replace <code>[YOUR TOPIC]</code> with your subject.
            </p>
            <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {AI_PROMPT_TEMPLATE.split("\n").slice(0, 5).join("\n") + "\n..."}
            </pre>
          </section>

          {/* Minimal example */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Minimal Example</h3>
              <CopyButton text={MINIMAL_EXAMPLE} label="Copy Example" />
            </div>
            <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre leading-relaxed max-h-64 overflow-y-auto">
              {MINIMAL_EXAMPLE}
            </pre>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MINIMAL_EXAMPLE = JSON.stringify(
  {
    format: "learnerverse-course-export",
    version: 1,
    course: {
      title: "Learn Python Basics",
      description: "A beginner-friendly Python course",
      category: "Programming",
      tags: ["python", "beginner"],
    },
    sections: [
      {
        title: "Getting Started",
        lessons: [
          {
            title: "What is Python?",
            lesson_type: "note",
            notes_markdown:
              "# What is Python?\n\nPython is a high-level programming language known for its simplicity.",
          },
          {
            title: "Install Python",
            lesson_type: "video",
            youtube_url: "https://www.youtube.com/watch?v=example",
            youtube_title: "How to Install Python",
            youtube_duration: "5:30",
            youtube_channel: "Python Tutorials",
          },
          {
            title: "Python Basics Quiz",
            lesson_type: "quiz",
            quiz_questions: [
              {
                question: "What is the file extension for Python files?",
                options: [".py", ".python", ".pt", ".pn"],
                correct_option: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  null,
  2,
);
