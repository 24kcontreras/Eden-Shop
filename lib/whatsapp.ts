export interface WhatsAppOrderItem {
  name: string;
  talla: string;
  qty: number;
  line: string;
}

export function buildWhatsAppOrderLink(params: {
  orderNumber: number;
  items: WhatsAppOrderItem[];
  total: string;
  whatsappNumber: string;
}) {
  const number = params.whatsappNumber;
  const lineas = params.items
    .map((i) => `• ${i.name} (talla ${i.talla}) x${i.qty} — ${i.line}`)
    .join("\n");
  const texto = `Hola! Quiero hacer este pedido (#${params.orderNumber}):\n\n${lineas}\n\nTotal: ${params.total}\n\nTe adjunto el PDF del pedido 🧾`;
  return `https://wa.me/${number}?text=${encodeURIComponent(texto)}`;
}
