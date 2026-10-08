import type { Ticket } from "./types";

const TEAL: [number, number, number] = [11, 92, 107];
const INK: [number, number, number] = [29, 42, 53];
const MUTED: [number, number, number] = [100, 116, 139];

/** Builds an A4 e-ticket PDF in the browser and triggers a download. jsPDF is loaded only on demand. */
export async function downloadTicketPdf(t: Ticket): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;

  // Header band
  doc.setFillColor(...TEAL); doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text("RailEase", M, 17);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text("Electronic Reservation Slip", M, 25);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("CONFIRMED", W - M, 21, { align: "right" });

  // PNR
  doc.setTextColor(...MUTED); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("PNR NUMBER", M, 48);
  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(26);
  doc.text(t.pnr, M, 59);

  // Journey box
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.6); doc.roundedRect(M, 68, W - 2 * M, 34, 2, 2);
  doc.setTextColor(...MUTED); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("FROM", M + 6, 77); doc.text("TO", W - M - 6, 77, { align: "right" });
  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(t.from, M + 6, 87); doc.text(t.to, W - M - 6, 87, { align: "right" });
  doc.setFontSize(11); doc.setTextColor(...TEAL);
  doc.text("to", W / 2, 86, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
  doc.text(`${t.train}`, M + 6, 96);
  doc.text(`Departs ${t.departure}`, W - M - 6, 96, { align: "right" });

  // Passengers table (one row per seat; adds pages if there are many)
  const FOOT = 268;
  const rowH = 10;
  let y = 116;
  const header = () => {
    doc.setFillColor(...TEAL); doc.rect(M, y - 6, W - 2 * M, 9, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("#", M + 3, y); doc.text("PASSENGER", M + 14, y); doc.text("SEAT", W - M - 3, y, { align: "right" });
    y += 9;
  };
  header();
  t.passengers.forEach((px, i) => {
    if (y > FOOT) { doc.addPage(); y = 20; header(); }
    if (i % 2 === 0) { doc.setFillColor(243, 246, 248); doc.rect(M, y - 6, W - 2 * M, rowH, "F"); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...MUTED); doc.text(String(i + 1), M + 3, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(px.name, 110)[0] as string, M + 14, y);
    doc.text(px.seat, W - M - 3, y, { align: "right" });
    y += rowH;
  });

  // Journey summary rows
  y += 6;
  const rows: [string, string][] = [["Date of journey", t.date], ["Departure time", t.departure], ["Passengers", String(t.passengers.length)], ["Total fare", `Rs. ${t.amount}`], ["Booking status", t.status]];
  if (y + rows.length * 10 + 40 > FOOT) { doc.addPage(); y = 24; }
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text(k, M + 3, y);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK); doc.text(v, W - M - 3, y, { align: "right" });
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(M, y + 3, W - M, y + 3);
    y += 10;
  });

  // Notes
  y += 6;
  if (y + 36 > FOOT) { doc.addPage(); y = 24; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK); doc.text("Important", M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  [
    "Each passenger must carry a valid photo ID matching the name on this ticket.",
    "Arrive at the station at least 30 minutes before departure.",
    "Refunds on cancellation: more than 24 h before departure 80%, 4 to 24 h 50%, under 4 h none.",
    "Keep your PNR handy. You can view or cancel this ticket anytime from the RailEase website.",
  ].forEach((n, i) => doc.text(doc.splitTextToSize(`${i + 1}. ${n}`, W - 2 * M), M, y + 6 + i * 6));

  // Footer
  const pages = doc.getNumberOfPages();
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3); doc.line(M, 281, W - M, 281);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(`PNR ${t.pnr}  |  Generated on ${new Date().toLocaleString()}  |  Computer-generated ticket  |  Page ${pg} of ${pages}`, W / 2, 287, { align: "center" });
  }

  doc.save(`RailEase-Ticket-${t.pnr}.pdf`);
}
