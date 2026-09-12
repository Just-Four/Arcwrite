"use client";

import { downloadTextFile } from "@/utils/download";
import { Document, Packer, Paragraph } from "docx";
import { jsPDF } from "jspdf";

export async function exportTextAsDocx(filename: string, text: string) {
  const paragraphs = (text || "").split(/\r?\n/).map((line) => new Paragraph({ text: line || "" }));
  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(filename.endsWith(".docx") ? filename : `${filename}.docx`, blob, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

export async function exportTextAsPdf(filename: string, text: string) {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  doc.setFont("Times", "Normal");
  doc.setFontSize(12);

  const lines = doc.splitTextToSize(text || "", maxWidth);
  let cursorY = margin;
  const lineHeight = 16;

  lines.forEach((ln) => {
    if (cursorY > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.text(ln, margin, cursorY, { baseline: "top" });
    cursorY += lineHeight;
  });

  const blob = doc.output("blob");
  triggerBlobDownload(filename.endsWith(".pdf") ? filename : `${filename}.pdf`, blob, "application/pdf");
}

export function exportTextAsTxt(filename: string, text: string) {
  downloadTextFile(filename.endsWith(".txt") ? filename : `${filename}.txt`, text || "");
}

function triggerBlobDownload(filename: string, blob: Blob, mime: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}