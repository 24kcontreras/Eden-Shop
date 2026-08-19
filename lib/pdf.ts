import jsPDF from "jspdf";

export interface OrderPdfItem {
  name: string;
  talla: string;
  qty: number;
  price: number;
}

export function downloadOrderPdf(params: {
  orderNumber: number;
  items: OrderPdfItem[];
  total: number;
  fmt: (n: number) => string;
}) {
  const { fmt } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const rightX = 547;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#5B2E36");
  doc.text("EDEN SHOP", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#8E5A62");
  y += 16;
  doc.text("Tienda online · Chile · +56 9 4631 2281", marginX, y);

  y += 28;
  doc.setDrawColor("#EBD0CC");
  doc.line(marginX, y, rightX, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#5B2E36");
  doc.text(`Pedido #${params.orderNumber}`, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#8E5A62");
  doc.text(
    new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }),
    420,
    y
  );

  y += 28;
  doc.setFontSize(9);
  doc.setTextColor("#A87B81");
  doc.text("PRENDA", marginX, y);
  doc.text("TALLA", 300, y);
  doc.text("CANT.", 370, y);
  doc.text("SUBTOTAL", 460, y);
  y += 8;
  doc.setDrawColor("#EBD0CC");
  doc.line(marginX, y, rightX, y);
  y += 18;

  doc.setFontSize(11);
  for (const item of params.items) {
    doc.setTextColor("#5B2E36");
    doc.text(item.name, marginX, y, { maxWidth: 230 });
    doc.setTextColor("#8E5A62");
    doc.text(item.talla, 300, y);
    doc.text(String(item.qty), 370, y);
    doc.text(fmt(item.price * item.qty), 460, y);
    y += 20;
  }

  y += 8;
  doc.setDrawColor("#EBD0CC");
  doc.line(marginX, y, rightX, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#5B2E36");
  doc.text("Total", marginX, y);
  doc.text(fmt(params.total), 460, y);

  y += 40;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#A87B81");
  doc.text(
    "Te escribimos al WhatsApp para coordinar el pago por transferencia y el despacho.",
    marginX,
    y,
    { maxWidth: 500 }
  );

  doc.save(`pedido-eden-${params.orderNumber}.pdf`);
}
