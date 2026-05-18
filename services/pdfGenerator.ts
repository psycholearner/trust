import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { DocumentMetadata, VerificationResult } from "../types";

export const PDFService = {
  
  // 1. Generate Registration Receipt with QR Code
  generateRegistrationReceipt: async (doc: DocumentMetadata) => {
    const pdf = new jsPDF();
    
    // Header
    pdf.setFillColor(14, 165, 233); // Brand color
    pdf.rect(0, 0, 210, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text("TrustChain AI", 20, 20);
    pdf.setFontSize(12);
    pdf.text("Digital Asset Registration Receipt", 20, 30);
    
    // QR Code Generation
    // Create a link to the verify page with the hash as a query parameter
    const verificationLink = `${window.location.origin}/#/verify?hash=${doc.hash}`;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationLink, { 
        errorCorrectionLevel: 'H',
        margin: 1,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
      });
      
      // Add QR Code to Top Right
      pdf.addImage(qrDataUrl, 'PNG', 160, 5, 30, 30);
      pdf.setFontSize(8);
      pdf.text("Scan to Verify", 175, 38, { align: "center" });

    } catch (err) {
      console.error("Error generating QR code for PDF", err);
    }

    // Content
    pdf.setTextColor(33, 33, 33);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);

    const data = [
      ["Document Title", doc.title],
      ["Document Type", doc.type],
      ["Issuer Identity", doc.issuerName],
      ["Registration Date", new Date(doc.createdAt).toLocaleString()],
      ["Blockchain Network", doc.network || "Unknown"],
      ["Transaction ID", doc.txHash || "Pending"],
      ["Status", doc.status],
    ];

    autoTable(pdf, {
      startY: 60,
      head: [['Attribute', 'Details']],
      body: data,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] },
    });

    // Hash & Technical Details
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Cryptographic Proofs", 20, finalY);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    
    pdf.text("SHA-256 Hash:", 20, finalY + 10);
    pdf.setFont("courier");
    pdf.text(doc.hash, 20, finalY + 16);

    pdf.setFont("helvetica");
    pdf.text("IPFS Content Identifier (CID):", 20, finalY + 26);
    pdf.setFont("courier");
    pdf.text(doc.ipfsCid, 20, finalY + 32);

    // Footer
    pdf.setFont("helvetica");
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text("This document is cryptographically secured on the blockchain.", 105, 280, { align: "center" });
    pdf.text(`Receipt ID: ${doc.id}`, 105, 285, { align: "center" });

    pdf.save(`Receipt_${doc.id}.pdf`);
  },

  // 2. Generate Verification Forensic Report
  generateVerificationReport: (result: VerificationResult) => {
    const pdf = new jsPDF();
    const isAuthentic = result.isValid;
    const color = isAuthentic ? [34, 197, 94] : [239, 68, 68]; // Green or Red

    // Header
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(0, 0, 210, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text("TrustChain AI", 20, 20);
    pdf.setFontSize(14);
    pdf.text("Forensic Verification Report", 20, 32);
    
    // Status Banner
    pdf.setTextColor(33, 33, 33);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(`VERIFICATION STATUS: ${isAuthentic ? 'AUTHENTIC' : 'FAILED'}`, 20, 55);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Ensemble Confidence Score: ${(result.aiAnalysis?.forensics?.overallScore || 0) * 100}%`, 20, 62);

    // AI Reasoning
    if (result.aiAnalysis?.reasoning) {
        pdf.setDrawColor(200);
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(20, 70, 170, 25, 3, 3, 'FD');
        pdf.setFontSize(9);
        pdf.setTextColor(60);
        const splitText = pdf.splitTextToSize(result.aiAnalysis.reasoning, 160);
        pdf.text(splitText, 25, 80);
    }

    // Forensic Metrics Table
    const forensics = result.aiAnalysis?.forensics;
    const metricData = [
        ["Visual Integrity", `${(forensics?.visual?.score || 0) * 100}%`, forensics?.visual?.status || "N/A"],
        ["Metadata Analysis", `${(forensics?.metadata?.score || 0) * 100}%`, forensics?.metadata?.status || "N/A"],
        ["Content Logic", `${(forensics?.content?.score || 0) * 100}%`, forensics?.content?.status || "N/A"]
    ];

    autoTable(pdf, {
      startY: 105,
      head: [['Forensic Layer', 'Score', 'Status']],
      body: metricData,
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50] },
    });

    // Blockchain Evidence
    if (result.document) {
        const evidenceY = (pdf as any).lastAutoTable.finalY + 15;
        pdf.setFontSize(12);
        pdf.setTextColor(33);
        pdf.text("Blockchain Evidence", 20, evidenceY);

        const blockchainData = [
            ["Issuer", result.document.issuerName],
            ["Registered Date", new Date(result.document.createdAt).toLocaleString()],
            ["Network", result.blockchainProof?.network || "Unknown"],
            ["Transaction Hash", result.blockchainProof?.txHash || "N/A"],
            ["IPFS CID", result.document.ipfsCid]
        ];

        autoTable(pdf, {
            startY: evidenceY + 5,
            body: blockchainData,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });
    }

    pdf.save(`Forensic_Report_${new Date().getTime()}.pdf`);
  },

  // 3. Generate System Analytics Report
  generateSystemReport: (type: 'DAILY' | 'MONTHLY' | 'ANNUAL', stats: any, logs: any[]) => {
    const pdf = new jsPDF();
    
    // Header
    pdf.setFillColor(30, 41, 59); // Slate 800
    pdf.rect(0, 0, 210, 50, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.text("TrustChain AI", 20, 25);
    pdf.setFontSize(14);
    pdf.text(`System Analytics Report - ${type}`, 20, 38);
    pdf.setFontSize(10);
    pdf.setTextColor(200);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);

    // Summary Stats
    pdf.setTextColor(33, 33, 33);
    pdf.setFontSize(14);
    pdf.text("Executive Summary", 20, 65);

    const statsData = [
        ["Total Documents Secured", stats.total.toLocaleString()],
        ["Verifications Processed", stats.verify24h.toLocaleString()],
        ["Fraud Attempts Blocked", stats.fraud.toLocaleString()],
        ["Active Issuers", stats.issuers.toString()]
    ];

    autoTable(pdf, {
        startY: 70,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Recent System Activity Log
    const logY = (pdf as any).lastAutoTable.finalY + 15;
    pdf.setFontSize(14);
    pdf.text("System Activity Log", 20, logY);

    const logData = logs.slice(0, 15).map(log => [log.time, log.type.toUpperCase(), log.msg]);

    autoTable(pdf, {
        startY: logY + 5,
        head: [['Timestamp', 'Type', 'Event Message']],
        body: logData,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 8 }
    });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text("TrustChain AI Enterprise Reporting Module", 105, 280, { align: "center" });

    pdf.save(`TrustChain_${type}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }
};