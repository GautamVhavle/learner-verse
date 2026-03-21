/**
 * Button that generates and downloads a PDF certificate using react-pdf.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { CertificateResponse } from "@/types/certificate";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0a0a0a",
    padding: 50,
    fontFamily: "Helvetica",
    position: "relative",
  },
  topBar: {
    height: 4,
    marginBottom: 40,
    borderRadius: 2,
    backgroundColor: "#a855f7",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    border: "1pt solid #222222",
    borderRadius: 12,
    padding: 50,
  },
  awardCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#a855f715",
    borderWidth: 1,
    borderColor: "#a855f730",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  awardText: {
    fontSize: 28,
    color: "#a855f7",
  },
  header: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 4,
    color: "#a855f7",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  brand: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fafafa",
    marginBottom: 24,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: "#333333",
    marginBottom: 24,
  },
  certifiesLabel: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fafafa",
    marginBottom: 20,
  },
  completedLabel: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 4,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 24,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  stat: {
    fontSize: 10,
    color: "#a1a1a1",
  },
  certId: {
    fontSize: 9,
    color: "#666666",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    fontFamily: "Courier",
  },
  dateText: {
    fontSize: 10,
    color: "#a1a1a1",
    marginBottom: 12,
  },
});

function CertificatePDF({
  certificate,
}: {
  certificate: CertificateResponse;
}) {
  const completedDate = new Date(certificate.completed_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topBar} />
        <View style={styles.container}>
          <View style={styles.awardCircle}>
            <Text style={styles.awardText}>★</Text>
          </View>
          <Text style={styles.header}>Certificate of Completion</Text>
          <Text style={styles.brand}>Learner Verse</Text>
          <View style={styles.divider} />
          <Text style={styles.certifiesLabel}>This certifies that</Text>
          <Text style={styles.userName}>{certificate.user_name}</Text>
          <Text style={styles.completedLabel}>
            has successfully completed
          </Text>
          <Text style={styles.courseName}>{certificate.course_title}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>
              {certificate.sections_count}{" "}
              {certificate.sections_count === 1 ? "section" : "sections"}
            </Text>
            <Text style={styles.stat}>·</Text>
            <Text style={styles.stat}>
              {certificate.lessons_count}{" "}
              {certificate.lessons_count === 1 ? "lesson" : "lessons"}
            </Text>
          </View>
          <Text style={styles.dateText}>{completedDate}</Text>
          <Text style={styles.certId}>{certificate.certificate_uid}</Text>
        </View>
      </Page>
    </Document>
  );
}

interface CertificateDownloadProps {
  certificate: CertificateResponse;
}

export function CertificateDownload({
  certificate,
}: CertificateDownloadProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <CertificatePDF certificate={certificate} />,
      ).toBlob();
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
    <Button
      onClick={handleDownload}
      variant="outline"
      className="gap-2"
      disabled={generating}
    >
      {generating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {generating ? "Generating..." : "Download PDF"}
    </Button>
  );
}
