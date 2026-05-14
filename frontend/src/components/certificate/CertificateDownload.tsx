/**
 * Generates and downloads a professional A4-landscape PDF certificate.
 * Design mirrors CertificatePreview as closely as react-pdf allows.
 *
 * A4 landscape = 842 × 595 pt.  All spacing is tuned so every element
 * sits on a single page with balanced whitespace.
 */
import { Document, Page, Text, View, StyleSheet, pdf, Image } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import type { CertificateResponse } from "@/types/certificate";

/* ── Palette ───────────────────────────────────────── */
const C = {
  white: "#ffffff",
  bg: "#f9fafb",
  border: "#e5e7eb",
  borderFaint: "#f1f5f9",
  text: "#111827",
  textSec: "#6b7280",
  textMuted: "#9ca3af",
  indigo: "#6366f1",
  indigoDark: "#4f46e5",
  lavender: "#ede9fe",
  lavBorder: "#c7d2fe",
  pillBg: "#f5f3ff",
  pillBorder: "#e0e7ff",
};

/* ── Styles ────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    fontFamily: "Helvetica",
    paddingVertical: 0,
    paddingHorizontal: 0,
    position: "relative",
  },

  /* Top accent stripe */
  topBar: { height: 6, backgroundColor: C.indigo },

  /* Content wrapper - fills remaining page, centered */
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 80,
    paddingVertical: 30,
  },

  /* ── Header ── */
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },
  logo: { width: 22, height: 22 },
  brand: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.textSec,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 22,
  },

  /* ── Emblem ── */
  emblem: {
    width: 64,
    height: 64,
    marginBottom: 18,
  },

  /* ── Title ── */
  title: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 6,
    color: C.indigo,
    textTransform: "uppercase",
    marginBottom: 16,
  },

  /* ── Divider ── */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: { width: 60, height: 0.5, backgroundColor: C.border },
  dividerDot: { fontSize: 7, color: C.textMuted },

  /* ── Labels ── */
  label: {
    fontSize: 8,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: "bold",
    color: C.text,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.indigoDark,
    marginBottom: 20,
    textAlign: "center",
    maxWidth: 500,
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginBottom: 14,
  },
  stat: { fontSize: 9, color: C.textSec },
  statDot: { fontSize: 6, color: C.textMuted },

  /* ── Date ── */
  date: { fontSize: 9, color: C.textSec, marginBottom: 16 },

  /* ── Cert ID pill ── */
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.pillBg,
    borderWidth: 0.5,
    borderColor: C.pillBorder,
    marginBottom: 12,
  },
  pillText: {
    fontSize: 8,
    fontFamily: "Courier",
    fontWeight: "bold",
    color: C.indigo,
    letterSpacing: 1,
  },

  /* ── Share URL ── */
  url: { fontSize: 6.5, color: C.textMuted },

  /* Bottom accent stripe */
  bottomBar: { height: 5, backgroundColor: C.indigoDark },

  /* Decorative corner markers */
  cornerTL: {
    position: "absolute",
    top: 22,
    left: 22,
    width: 30,
    height: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: C.borderFaint,
  },
  cornerTR: {
    position: "absolute",
    top: 22,
    right: 22,
    width: 30,
    height: 30,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: C.borderFaint,
  },
  cornerBL: {
    position: "absolute",
    bottom: 22,
    left: 22,
    width: 30,
    height: 30,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: C.borderFaint,
  },
  cornerBR: {
    position: "absolute",
    bottom: 22,
    right: 22,
    width: 30,
    height: 30,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: C.borderFaint,
  },
});

/* ── PDF Document ──────────────────────────────────── */

export function CertificatePDF({ certificate }: { certificate: CertificateResponse }) {
  const completedDate = new Date(certificate.completed_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shareUrl = `${window.location.origin}/certificates/share/${certificate.certificate_uid}`;

  // Truncate long values to prevent PDF layout overflow
  const displayName =
    certificate.user_name.length > 100
      ? certificate.user_name.slice(0, 100) + "…"
      : certificate.user_name;
  const displayTitle =
    certificate.course_title.length > 200
      ? certificate.course_title.slice(0, 200) + "…"
      : certificate.course_title;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Top bar */}
        <View style={s.topBar} />

        {/* Corner decorations */}
        <View style={s.cornerTL} />
        <View style={s.cornerTR} />
        <View style={s.cornerBL} />
        <View style={s.cornerBR} />

        {/* Centred content */}
        <View style={s.body}>
          {/* Brand name */}
          <Text style={s.brand}>Learner Verse</Text>

          {/* Emblem */}
          <Image src="/badge.png" style={s.emblem} />

          <Text style={s.title}>Certificate of Completion</Text>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerDot}>✦</Text>
            <View style={s.dividerLine} />
          </View>

          <Text style={s.label}>This is to certify that</Text>
          <Text style={s.userName}>{displayName}</Text>

          <Text style={s.label}>has successfully completed</Text>
          <Text style={s.courseName}>{displayTitle}</Text>

          {/* Stats */}
          <View style={s.statsRow}>
            <Text style={s.stat}>
              {certificate.sections_count}{" "}
              {certificate.sections_count === 1 ? "section" : "sections"}
            </Text>
            <Text style={s.statDot}>·</Text>
            <Text style={s.stat}>
              {certificate.lessons_count} {certificate.lessons_count === 1 ? "lesson" : "lessons"}
            </Text>
          </View>

          <Text style={s.date}>{completedDate}</Text>

          {/* Cert ID */}
          <View style={s.pill}>
            <Text style={s.pillText}>{certificate.certificate_uid}</Text>
          </View>

          <Text style={s.url}>{shareUrl}</Text>
        </View>

        {/* Bottom bar */}
        <View style={s.bottomBar} />
      </Page>
    </Document>
  );
}

/* ── Download Button ───────────────────────────────── */

interface CertificateDownloadProps {
  certificate: CertificateResponse;
}

export function CertificateDownload({ certificate }: CertificateDownloadProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(<CertificatePDF certificate={certificate} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${certificate.certificate_uid}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
      style={{ background: "#6366f1" }}
    >
      {generating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {generating ? "Generating…" : "Download PDF"}
    </button>
  );
}
