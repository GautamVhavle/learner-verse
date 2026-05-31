/**
 * Help & Support page - simple contact form that generates a mailto link
 * with a professional query template pre-filled.
 */
import { useState, useEffect } from "react";
import {
  HelpCircle,
  Mail,
  Send,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserQuery } from "@/hooks/useUser";

const SUPPORT_EMAIL = "gautamvhavle@gmail.com";

const CATEGORIES = [
  { label: "Bug Report", value: "bug" },
  { label: "Feature Request", value: "feature" },
  { label: "Account Issue", value: "account" },
  { label: "General Question", value: "general" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

const QUICK_LINKS = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn how to create courses, enroll, and start learning.",
    href: "/",
  },
  {
    icon: MessageSquare,
    title: "Ask LiVi",
    description: "Use our AI assistant for instant help while studying.",
    href: "#livi",
  },
];

export default function HelpPage() {
  const { data: user } = useUserQuery();
  const [category, setCategory] = useState<Category>("general");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    document.title = "Help & Support | LearnerVerse";
  }, []);

  const userName = user?.display_name ?? "User";
  const userEmail = user?.email ?? "";

  function buildMailto() {
    const sub =
      subject.trim() || `[${CATEGORIES.find((c) => c.value === category)!.label}] Support Request`;

    const body = [
      `Hi Learner Verse Team,`,
      ``,
      `${description.trim() || "[Please describe your issue or question here]"}`,
      ``,
      `---`,
      `Category: ${CATEGORIES.find((c) => c.value === category)!.label}`,
      `User: ${userName}`,
      `Email: ${userEmail}`,
      `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `App Version: 1.0.0`,
    ].join("\n");

    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <div className="bg-bg-tertiary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <HelpCircle className="text-text-secondary size-5" />
        </div>
        <div>
          <h1 className="text-text-primary text-2xl font-semibold">Help & Support</h1>
          <p className="text-text-secondary mt-0.5 text-sm">
            Have a question or ran into an issue? We're here to help.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <section className="grid gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.title}
            href={link.href}
            className="border-border-default bg-bg-secondary hover:border-accent-blue/30 group flex items-start gap-3 rounded-xl border p-4 transition-colors"
          >
            <div className="bg-accent-blue/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <link.icon className="text-accent-blue size-4" />
            </div>
            <div className="flex-1">
              <p className="text-text-primary text-sm font-medium">{link.title}</p>
              <p className="text-text-tertiary mt-0.5 text-xs leading-relaxed">
                {link.description}
              </p>
            </div>
            <ChevronRight className="text-text-tertiary mt-0.5 size-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ))}
      </section>

      {/* Contact Form */}
      <section className="border-border-default bg-bg-secondary space-y-5 rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <Mail className="text-accent-purple size-4" />
          <h2 className="text-text-primary text-sm font-semibold">Contact Support</h2>
        </div>
        <p className="text-text-tertiary text-xs leading-relaxed">
          Fill in the details below and click send - it will open your email client with a
          pre-formatted message ready to go.
        </p>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-text-secondary text-xs font-medium">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat.value
                    ? "border-accent-blue bg-accent-blue/5 text-accent-blue ring-accent-blue/30 ring-1"
                    : "border-border-default bg-bg-tertiary text-text-secondary hover:border-border-hover"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label htmlFor="help-subject" className="text-text-secondary text-xs font-medium">
            Subject
          </label>
          <Input
            id="help-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Issue with course enrollment"
            className="border-border-default bg-bg-tertiary text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:ring-accent-blue/30 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="help-desc" className="text-text-secondary text-xs font-medium">
            Description
          </label>
          <textarea
            id="help-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue or question in detail. Include steps to reproduce if it's a bug."
            rows={5}
            className="border-border-default bg-bg-tertiary text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:ring-accent-blue/30 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          />
        </div>

        {/* Send */}
        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-text-tertiary text-[11px]">
            Opens your default email client with a pre-filled message.
          </p>
          <a
            href={buildMailto()}
            className="bg-accent-blue hover:bg-accent-blue/90 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors"
          >
            <Send className="size-3.5" />
            Send Email
          </a>
        </div>
      </section>

      {/* Direct email fallback */}
      <section className="border-border-default bg-bg-secondary rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent-green/10 flex size-9 items-center justify-center rounded-lg">
              <Mail className="text-accent-green size-4" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">Email Us Directly</p>
              <p className="text-text-tertiary text-xs">
                Prefer to write your own email? Reach us anytime.
              </p>
            </div>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-accent-blue hover:bg-accent-blue/10 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            {SUPPORT_EMAIL}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </section>
    </div>
  );
}
