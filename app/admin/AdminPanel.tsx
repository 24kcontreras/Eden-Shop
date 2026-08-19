"use client";

import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

export type Product = {
  id: string;
  name: string;
  desc: string;
  material: string;
  price: number;
  offerPrice: number | null;
  sizes: string[];
  stock: Record<string, number>;
  colors: string[];
  img: string;
  imgPos: string;
  published: boolean;
};

export type Look = {
  id: string;
  name: string;
  productIds: string[];
  price: number;
};

export type OrderItem = {
  productId: string;
  name: string;
  talla: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  orderNumber: number;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
};

type Tab = "prendas" | "looks" | "pedidos";
type Sheet = "prenda" | "look" | null;

type PrendaForm = {
  name: string;
  desc: string;
  material: string;
  price: string;
  tallasSel: string[];
  stock: Record<string, number>;
  colores: string[];
  img: string;
  pos: string;
  publicada: boolean;
  oferta: boolean;
  precioOferta: string;
};

type LookForm = {
  name: string;
  ids: string[];
  price: string;
};

const FALLBACK_IMG = "/products/chenille.jpg";
const ACCENT = "#B25C71";

const PALETA = [
  "#C1194F", "#E8A6BE", "#93A6C6", "#6E7A5A", "#232323", "#8B4A22",
  "#CBB09A", "#A9A19B", "#F5F3F0", "#C6AB7E", "#B7B4B0", "#1B1B20",
];

const TALLAS = ["Estándar", "XS", "S", "M", "L", "XL", "2XL", "36", "38", "40", "42", "44", "46"];

const EMPTY_FORM: PrendaForm = {
  name: "", desc: "", material: "", price: "", tallasSel: [], stock: {}, colores: [],
  img: "", pos: "center 40%", publicada: true, oferta: false, precioOferta: "",
};
const EMPTY_LFORM: LookForm = { name: "", ids: [], price: "" };

const LABEL_STYLE: CSSProperties = {
  fontSize: 10, letterSpacing: ".26em", textTransform: "uppercase", color: "#A87B81",
};
const INPUT_STYLE: CSSProperties = {
  width: "100%", height: 50, border: "1px solid #E3C7C4", borderRadius: 14, background: "#FFFFFF",
  padding: "0 15px", fontSize: 15.5, color: "#5B2E36", transition: "border-color .3s ease",
};
const TEXTAREA_STYLE: CSSProperties = {
  width: "100%", border: "1px solid #E3C7C4", borderRadius: 14, background: "#FFFFFF",
  padding: "13px 15px", fontSize: 15, lineHeight: 1.5, color: "#5B2E36", resize: "none",
  transition: "border-color .3s ease",
};

function withPress(style: CSSProperties, vars: Record<string, string>): CSSProperties {
  return { ...style, ...vars } as CSSProperties;
}

function fmt(n: number) {
  return "$" + Math.round(n || 0).toLocaleString("es-CL");
}

function totalStock(sizes: string[], stock: Record<string, number>) {
  return sizes.reduce((n, t) => n + (stock[t] || 0), 0);
}
function agotadas(sizes: string[], stock: Record<string, number>) {
  return sizes.filter((t) => !(stock[t] > 0)).length;
}

export default function AdminPanel({
  initialProducts,
  initialLooks,
  initialOrders,
}: {
  initialProducts: Product[];
  initialLooks: Look[];
  initialOrders: Order[];
}) {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [looks, setLooks] = useState<Look[]>(initialLooks);
  const [orders] = useState<Order[]>(initialOrders);

  const [tab, setTab] = useState<Tab>("prendas");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [nuevoId, setNuevoId] = useState<string | null>(null);

  const [toast, setToast] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scrolled, setScrolled] = useState(false);

  const [form, setForm] = useState<PrendaForm>(EMPTY_FORM);
  const [lform, setLform] = useState<LookForm>(EMPTY_LFORM);

  const [uploading, setUploading] = useState(false);

  const [locked, setLocked] = useState(false);
  useEffect(() => {
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [locked]);

  // ---- scroll-reveal (rAF-free, mirrors the DC scan()/reveal()/paint() pass) ----
  function paint(el: HTMLElement) {
    if (el.dataset.rev === "1") {
      el.style.transitionDelay = (el.dataset.delay || "0") + "ms";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    } else if (el.dataset.rev === "0") {
      el.style.transitionDelay = "0ms";
      el.style.opacity = el.dataset.op0 || "1";
      el.style.transform = el.dataset.from || "none";
    }
  }

  function scan() {
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (!el.dataset.seen) {
        el.dataset.seen = "1";
        el.dataset.from = el.style.transform || "none";
        el.dataset.op0 = el.style.opacity || "1";
      }
      paint(el);
    });
  }

  function reveal() {
    const h = window.innerHeight;
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const v = r.top < h * 0.96 && r.bottom > 0 ? "1" : "0";
      if (el.dataset.rev !== v) {
        el.dataset.rev = v;
        paint(el);
      }
    });
  }

  // Runs after every render — equivalent to componentDidMount + componentDidUpdate.
  useEffect(() => {
    scan();
    reveal();
  });

  useEffect(() => {
    const onScroll = () => {
      reveal();
      const s = window.scrollY > 16;
      setScrolled((prev) => (prev !== s ? s : prev));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (toastT.current) clearTimeout(toastT.current);
    };
  }, []);

  function aviso(txt: string) {
    setToast(txt);
    setToastOn(true);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastOn(false), 1900);
  }

  const byId = (id: string) => products.find((p) => p.id === id);

  // ---- sheet open/close ----
  function cerrar() {
    setSheet(null);
    setLocked(false);
  }

  function nuevaPrenda() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setSheet("prenda");
    setLocked(true);
  }

  function editar(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      desc: p.desc,
      material: p.material,
      price: String(p.price),
      tallasSel: p.sizes.slice(),
      stock: { ...p.stock },
      colores: p.colors.slice(),
      img: p.img,
      pos: p.imgPos,
      publicada: p.published,
      oferta: !!(p.offerPrice && p.offerPrice > 0),
      precioOferta: p.offerPrice ? String(p.offerPrice) : "",
    });
    setSheet("prenda");
    setLocked(true);
  }

  function nuevoLook() {
    setEditId(null);
    setLform({ ...EMPTY_LFORM });
    setSheet("look");
    setLocked(true);
  }

  function editarLook(l: Look) {
    setEditId(l.id);
    setLform({ name: l.name, ids: l.productIds.slice(), price: String(l.price) });
    setSheet("look");
    setLocked(true);
  }

  function campo<K extends keyof PrendaForm>(k: K, v: PrendaForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function lcampo<K extends keyof LookForm>(k: K, v: LookForm[K]) {
    setLform((f) => ({ ...f, [k]: v }));
  }

  function toggleTalla(t: string) {
    setForm((s) => {
      let sel = s.tallasSel.slice();
      const stock = { ...s.stock };
      if (t === "Estándar") {
        if (sel.indexOf(t) > -1) {
          sel = [];
          delete stock["Estándar"];
        } else {
          sel = ["Estándar"];
          stock["Estándar"] = stock["Estándar"] || 1;
        }
      } else {
        sel = sel.filter((x) => x !== "Estándar");
        delete stock["Estándar"];
        const i = sel.indexOf(t);
        if (i > -1) {
          sel.splice(i, 1);
          delete stock[t];
        } else {
          sel.push(t);
          stock[t] = stock[t] || 1;
        }
        sel = TALLAS.filter((x) => sel.indexOf(x) > -1);
      }
      return { ...s, tallasSel: sel, stock };
    });
  }

  function setStock(t: string, d: number) {
    setForm((s) => {
      const stock = { ...s.stock };
      stock[t] = Math.max(0, Math.min(99, (stock[t] || 0) + d));
      return { ...s, stock };
    });
  }

  function addColor(hex: string) {
    setForm((s) => {
      if (s.colores.indexOf(hex) > -1) return s;
      return { ...s, colores: s.colores.concat([hex]) };
    });
  }

  function delColor(i: number) {
    setForm((s) => {
      const c = s.colores.slice();
      c.splice(i, 1);
      return { ...s, colores: c };
    });
  }

  function toggleLookId(id: string) {
    setLform((s) => {
      const ids = s.ids.slice();
      const i = ids.indexOf(id);
      if (i > -1) ids.splice(i, 1);
      else ids.push(id);
      return { ...s, ids };
    });
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data: { url: string } = await res.json();
      setForm((f) => ({ ...f, img: data.url, pos: "center 40%" }));
    } catch {
      aviso("No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function togglePubRow(p: Product, e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const nextPub = !p.published;
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: nextPub } : x)));
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPub }),
      });
      if (!res.ok) throw new Error("update failed");
      aviso(p.published ? p.name + " pasó a borrador" : p.name + " ya está en la tienda");
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: p.published } : x)));
      aviso("No se pudo actualizar. Intenta de nuevo.");
    }
  }

  async function borrar() {
    if (!editId) return;
    if (sheet === "prenda") {
      try {
        const res = await fetch(`/api/admin/products/${editId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("delete failed");
        setProducts((prev) => prev.filter((p) => p.id !== editId));
        aviso("Prenda eliminada");
        cerrar();
      } catch {
        aviso("No se pudo eliminar. Intenta de nuevo.");
      }
    } else {
      try {
        const res = await fetch(`/api/admin/looks/${editId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("delete failed");
        setLooks((prev) => prev.filter((l) => l.id !== editId));
        aviso("Look eliminado");
        cerrar();
      } catch {
        aviso("No se pudo eliminar. Intenta de nuevo.");
      }
    }
  }

  async function guardar() {
    if (sheet === "prenda") {
      const nombre = form.name.trim() || "Prenda sin nombre";
      const precio = parseInt(String(form.price).replace(/\D/g, ""), 10) || 0;
      const stockLimpio: Record<string, number> = {};
      form.tallasSel.forEach((t) => {
        stockLimpio[t] = form.stock[t] || 0;
      });
      const ofertaNum = form.oferta ? parseInt(String(form.precioOferta).replace(/\D/g, ""), 10) || 0 : 0;
      const payload = {
        name: nombre,
        desc: form.desc,
        material: form.material,
        price: precio,
        offerPrice: ofertaNum > 0 ? ofertaNum : null,
        sizes: form.tallasSel,
        stock: stockLimpio,
        colors: form.colores,
        img: form.img,
        imgPos: form.pos,
        published: form.publicada,
      };
      try {
        if (editId) {
          const res = await fetch(`/api/admin/products/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("save failed");
          const updated: Product = await res.json();
          setProducts((prev) => prev.map((p) => (p.id === editId ? updated : p)));
          aviso("Cambios guardados");
        } else {
          const res = await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("save failed");
          const created: Product = await res.json();
          setProducts((prev) => [created, ...prev]);
          setNuevoId(created.id);
          aviso(form.publicada ? nombre + " ya está en la tienda" : nombre + " quedó como borrador");
        }
        cerrar();
      } catch {
        aviso("No se pudo guardar. Intenta de nuevo.");
      }
    } else {
      const nombre = lform.name.trim() || "Look sin nombre";
      const precio = parseInt(String(lform.price).replace(/\D/g, ""), 10) || 0;
      const payload = { name: nombre, productIds: lform.ids, price: precio };
      try {
        if (editId) {
          const res = await fetch(`/api/admin/looks/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("save failed");
          const updated: Look = await res.json();
          setLooks((prev) => prev.map((l) => (l.id === editId ? updated : l)));
          aviso("Look actualizado");
        } else {
          const res = await fetch("/api/admin/looks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("save failed");
          const created: Look = await res.json();
          setLooks((prev) => [created, ...prev]);
          setNuevoId(created.id);
          aviso("Look creado");
        }
        cerrar();
      } catch {
        aviso("No se pudo guardar. Intenta de nuevo.");
      }
    }
  }

  async function cerrarSesion() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  }

  // ---- derived values ----
  const pub = products.filter((p) => p.published).length;
  const porReponer = products.filter((p) => p.published && agotadas(p.sizes, p.stock) > 0);
  const sinNada = products.filter((p) => p.published && totalStock(p.sizes, p.stock) === 0).length;
  const mostrarAlerta = porReponer.length > 0;
  const alertaTxt = sinNada > 0
    ? sinNada + (sinNada === 1 ? " prenda publicada está agotada" : " prendas publicadas están agotadas") + " · revisa el stock"
    : porReponer.length + (porReponer.length === 1 ? " prenda tiene tallas agotadas" : " prendas tienen tallas agotadas") + " · " + porReponer.map((p) => p.name).join(", ");

  const stats = [
    { n: pub, label: "Publicadas", delay: 0 },
    { n: products.length - pub, label: "Borradores", delay: 70 },
    { n: looks.length, label: "Looks", delay: 140 },
  ];

  const tabIndex = tab === "prendas" ? 0 : tab === "looks" ? 1 : 2;
  const tabX = tabIndex === 0 ? "0%" : tabIndex === 1 ? "100%" : "200%";

  const fPrecio = parseInt(String(form.price).replace(/\D/g, ""), 10) || 0;
  const fOfertaNum = parseInt(String(form.precioOferta).replace(/\D/g, ""), 10) || 0;
  const ofertaViva = form.oferta && fPrecio > 0 && fOfertaNum > 0 && fOfertaNum < fPrecio;
  const fStockTotal = form.tallasSel.reduce((n, t) => n + (form.stock[t] || 0), 0);

  const lsuma = lform.ids.reduce((n, id) => n + (byId(id)?.price || 0), 0);
  const lprecio = parseInt(String(lform.price).replace(/\D/g, ""), 10) || 0;
  const loff = lsuma > 0 && lprecio > 0 && lprecio < lsuma ? "-" + Math.round((1 - lprecio / lsuma) * 100) + "%" : "sin descuento";

  const sheetTitle = sheet === "look" ? (editId ? "Editar look" : "Nuevo look") : editId ? "Editar prenda" : "Nueva prenda";
  const guardarLabel = editId ? "Guardar cambios" : sheet === "look" ? "Crear look" : "Publicar prenda";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#FDF7F5", minHeight: "100vh", overflowX: "hidden", position: "relative" }}>
      <style>{`@keyframes adminSpin{to{transform:rotate(360deg)}}`}</style>

      <header
        style={{
          position: "sticky", top: 0, zIndex: 40, background: "rgba(253,247,245,.86)",
          backdropFilter: "blur(20px) saturate(1.4)", WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderBottom: `1px solid ${scrolled ? "#EBD0CC" : "rgba(235,208,204,0)"}`,
          transition: "border-color .4s cubic-bezier(.32,.72,0,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "'Italiana',Georgia,serif", fontSize: 24, lineHeight: 1, letterSpacing: ".17em" }}>EDEN SHOP</span>
            <span style={{ fontSize: 8.5, letterSpacing: ".3em", textTransform: "uppercase", color: "#A87B81" }}>Panel de administración</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="press"
              style={withPress(
                { fontSize: 12.5, letterSpacing: ".02em", border: "1px solid #E3C7C4", borderRadius: 999, padding: "9px 14px", transition: "transform .45s cubic-bezier(.32,.72,0,1),background .3s ease" },
                { "--press-scale": "scale(.94)", "--press-bg": "#F3E2DE" }
              )}
            >
              Ver tienda ↗
            </a>
            <button
              onClick={cerrarSesion}
              className="press"
              style={withPress(
                { border: 0, background: "transparent", color: "#A87B81", fontSize: 11.5, letterSpacing: ".02em", cursor: "pointer", padding: "9px 6px" },
                { "--press-color": "#B25C71" }
              )}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "16px 16px 4px" }}>
        {stats.map((s) => (
          <div
            key={s.label}
            data-reveal
            data-delay={s.delay}
            style={{
              opacity: 0, transform: "translateY(16px)",
              transition: "opacity .7s cubic-bezier(.32,.72,0,1),transform .7s cubic-bezier(.32,.72,0,1)",
              background: "#FDF7F5", border: "1px solid #EBD0CC", borderRadius: 16, padding: "13px 12px",
              display: "flex", flexDirection: "column", gap: 3,
            }}
          >
            <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 27, lineHeight: 1 }}>{s.n}</span>
            <span style={{ fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#A87B81" }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 16px 10px" }}>
        {mostrarAlerta && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7EAE7", border: "1px solid #EBD0CC", borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
            <span style={{ flex: "none", width: 8, height: 8, borderRadius: 4, background: ACCENT }}></span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: "#5B2E36" }}>{alertaTxt}</span>
          </div>
        )}
        <div style={{ position: "relative", display: "flex", background: "#EFD9D5", borderRadius: 999, padding: 4 }}>
          <div
            style={{
              position: "absolute", top: 4, bottom: 4, left: 4, width: "calc(33.333% - 2.667px)",
              borderRadius: 999, background: "#FDF7F5", boxShadow: "0 2px 10px rgba(91,46,54,.12)",
              transform: `translateX(${tabX})`, transition: "transform .55s cubic-bezier(.32,.72,0,1)",
            }}
          ></div>
          <button onClick={() => setTab("prendas")} style={{ position: "relative", flex: 1, height: 42, border: 0, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, letterSpacing: ".02em", color: tab === "prendas" ? "#5B2E36" : "#A87B81", transition: "color .4s ease" }}>Prendas</button>
          <button onClick={() => setTab("looks")} style={{ position: "relative", flex: 1, height: 42, border: 0, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, letterSpacing: ".02em", color: tab === "looks" ? "#5B2E36" : "#A87B81", transition: "color .4s ease" }}>Looks</button>
          <button onClick={() => setTab("pedidos")} style={{ position: "relative", flex: 1, height: 42, border: 0, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, letterSpacing: ".02em", color: tab === "pedidos" ? "#5B2E36" : "#A87B81", transition: "color .4s ease" }}>Pedidos</button>
        </div>
      </div>

      {tab === "prendas" && (
        <div style={{ padding: "6px 16px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={nuevaPrenda}
            className="press"
            style={withPress(
              { width: "100%", minHeight: 56, border: "1.5px dashed #E3C7C4", borderRadius: 18, background: "transparent", color: "#B25C71", fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform .45s cubic-bezier(.32,.72,0,1),background .3s ease,border-color .3s ease" },
              { "--press-scale": "scale(.975)", "--press-bg": "#F9EDEA", "--press-border": "#B25C71" }
            )}
          >
            + &nbsp;Nueva prenda
          </button>

          {products.map((p, i) => {
            const stock = totalStock(p.sizes, p.stock);
            const meta = (p.sizes.length ? p.sizes.join(" · ") : "Sin tallas") + (p.colors.length ? " · " + p.colors.length + " colores" : "");
            const hasOffer = !!(p.offerPrice && p.offerPrice > 0);
            const isNew = p.id === nuevoId;
            return (
              <div
                key={p.id}
                data-reveal
                data-delay={i * 70}
                onClick={() => editar(p)}
                className="press"
                style={withPress(
                  {
                    opacity: 0, transform: "translateY(20px)",
                    transition: "opacity .7s cubic-bezier(.32,.72,0,1),transform .5s cubic-bezier(.32,.72,0,1)",
                    animation: isNew ? "adminIn .75s cubic-bezier(.22,1.04,.36,1) both" : "none",
                    display: "flex", alignItems: "center", gap: 13, background: isNew ? "#F9EDEA" : "#FDF7F5",
                    border: "1px solid #EBD0CC", borderRadius: 18, padding: "13px 13px", cursor: "pointer",
                  },
                  { "--press-scale": "scale(.975)" }
                )}
              >
                <div style={{ position: "relative", width: 58, height: 74, borderRadius: 12, overflow: "hidden", background: "#EFD9D5", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={p.img || FALLBACK_IMG} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: p.imgPos, opacity: p.img ? 1 : 0 }} />
                  <span style={{ position: "absolute", fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#A87B81", opacity: p.img ? 0 : 1 }}>sin foto</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 19, lineHeight: 1.1 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: "#A87B81", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    {hasOffer && <span style={{ fontSize: 12.5, color: "#C99AA4", textDecoration: "line-through" }}>{fmt(p.price)}</span>}
                    <span style={{ fontSize: 15, fontWeight: 600, color: hasOffer ? ACCENT : "#5B2E36" }}>{fmt(hasOffer ? (p.offerPrice as number) : p.price)}</span>
                    <span style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 999, background: p.published ? "#EFD9D5" : "transparent", color: p.published ? "#5B2E36" : "#C3A0A3" }}>{p.published ? "En la tienda" : "Borrador"}</span>
                    <span style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 999, background: stock === 0 ? "#5B2E36" : stock <= 2 ? ACCENT : "transparent", color: stock <= 2 ? "#FDF7F5" : "#A87B81" }}>{stock === 0 ? "Agotado" : stock <= 2 ? "Últimas " + stock : stock + " en stock"}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => togglePubRow(p, e)}
                  style={{ width: 46, height: 28, flex: "none", border: 0, borderRadius: 999, background: p.published ? ACCENT : "#E3C7C4", cursor: "pointer", padding: 3, display: "flex", transition: "background .4s cubic-bezier(.32,.72,0,1)" }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#FDF7F5", boxShadow: "0 1px 4px rgba(91,46,54,.28)", transform: `translateX(${p.published ? "18px" : "0px"})`, transition: "transform .48s cubic-bezier(.34,1.5,.64,1)" }}></span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "looks" && (
        <div style={{ padding: "6px 16px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={nuevoLook}
            className="press"
            style={withPress(
              { width: "100%", minHeight: 56, border: "1.5px dashed #E3C7C4", borderRadius: 18, background: "transparent", color: "#B25C71", fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform .45s cubic-bezier(.32,.72,0,1),background .3s ease,border-color .3s ease" },
              { "--press-scale": "scale(.975)", "--press-bg": "#F9EDEA", "--press-border": "#B25C71" }
            )}
          >
            + &nbsp;Nuevo look
          </button>

          {looks.map((l, i) => {
            const prods = l.productIds.map((id) => byId(id)).filter((p): p is Product => !!p);
            const prendasTxt = prods.map((p) => p.name).join(" + ") || "Sin prendas";
            const suma = prods.reduce((n, p) => n + p.price, 0);
            const off = suma > 0 && l.price < suma ? "-" + Math.round((1 - l.price / suma) * 100) + "%" : "pack";
            const isNew = l.id === nuevoId;
            return (
              <div
                key={l.id}
                data-reveal
                data-delay={i * 80}
                onClick={() => editarLook(l)}
                className="press"
                style={withPress(
                  {
                    opacity: 0, transform: "translateY(20px)",
                    transition: "opacity .7s cubic-bezier(.32,.72,0,1),transform .5s cubic-bezier(.32,.72,0,1)",
                    animation: isNew ? "adminIn .75s cubic-bezier(.22,1.04,.36,1) both" : "none",
                    background: "#FDF7F5", border: "1px solid #EBD0CC", borderRadius: 20, overflow: "hidden", cursor: "pointer",
                  },
                  { "--press-scale": "scale(.98)" }
                )}
              >
                <div style={{ display: "flex", gap: 2 }}>
                  {prods.map((p) => (
                    <img key={p.id} src={p.img || FALLBACK_IMG} alt="" style={{ flex: 1, width: 0, height: 112, objectFit: "cover", objectPosition: p.imgPos }} />
                  ))}
                </div>
                <div style={{ padding: "14px 16px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 20, lineHeight: 1.1 }}>{l.name}</span>
                    <span style={{ fontSize: 12, color: "#A87B81", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prendasTxt}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flex: "none" }}>
                    <span style={{ fontSize: 11.5, color: "#C99AA4", textDecoration: "line-through" }}>{fmt(suma)}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{fmt(l.price)}</span>
                      <span style={{ fontSize: 9.5, letterSpacing: ".1em", padding: "4px 8px", borderRadius: 999, background: "#5B2E36", color: "#FDF7F5" }}>{off}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "pedidos" && (
        <div style={{ padding: "6px 16px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.length === 0 ? (
            <div style={{ padding: "30px 8px", textAlign: "center", fontSize: 13, color: "#A87B81" }}>Todavía no hay pedidos.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} style={{ background: "#FDF7F5", border: "1px solid #EBD0CC", borderRadius: 18, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 19 }}>Pedido #{o.orderNumber}</span>
                  <span style={{ fontSize: 11.5, color: "#A87B81" }}>
                    {new Date(o.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {o.items.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: "#5B2E36" }}>
                      <span>
                        {it.qty}× {it.name} <span style={{ color: "#A87B81" }}>({it.talla})</span>
                      </span>
                      <span style={{ color: "#8E5A62" }}>{fmt(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid #EBD0CC", paddingTop: 10 }}>
                  <span style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 999, background: "#EFD9D5", color: "#5B2E36" }}>{o.status}</span>
                  <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 20 }}>{fmt(o.total)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div
        onClick={cerrar}
        style={{
          position: "fixed", inset: 0, zIndex: 60, background: "rgba(91,46,54,.46)",
          backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
          opacity: sheet ? 1 : 0, pointerEvents: sheet ? "auto" : "none",
          transition: "opacity .5s cubic-bezier(.32,.72,0,1)",
        }}
      ></div>

      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70, margin: "0 auto", maxWidth: 480,
          height: "92vh", background: "#FDF7F5", borderRadius: "26px 26px 0 0", boxShadow: "0 -18px 60px rgba(91,46,54,.3)",
          transform: `translateY(${sheet ? "0%" : "102%"})`, transition: "transform .58s cubic-bezier(.32,.72,0,1)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flex: "none" }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: "#E3C7C4" }}></div>
        </div>
        <div style={{ flex: "none", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "10px 20px 12px" }}>
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 26, fontWeight: 400 }}>{sheetTitle}</h2>
          <button
            onClick={borrar}
            className="press"
            style={withPress(
              { border: 0, background: "transparent", color: "#C99AA4", fontSize: 12.5, cursor: "pointer", padding: 6, opacity: editId ? 1 : 0, pointerEvents: editId ? "auto" : "none", transition: "opacity .3s ease,color .3s ease" },
              { "--press-color": "#B25C71" }
            )}
          >
            Eliminar
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
          {sheet !== "look" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <span style={LABEL_STYLE}>Fotos de la prenda</span>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                  <div
                    style={{
                      flex: "none", width: 62, height: 78, borderRadius: 12, overflow: "hidden", background: "#EFD9D5",
                      position: "relative", boxShadow: form.img ? `0 0 0 2.5px ${ACCENT}` : "0 0 0 0px rgba(0,0,0,0)",
                      transition: "box-shadow .4s cubic-bezier(.32,.72,0,1)",
                    }}
                  >
                    {form.img ? (
                      <img src={form.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: form.pos }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#C3A0A3", textAlign: "center", padding: 6 }}>
                        Sin foto
                      </div>
                    )}
                    {uploading && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(253,247,245,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #E3C7C4", borderTopColor: ACCENT, animation: "adminSpin .7s linear infinite" }}></span>
                      </div>
                    )}
                  </div>
                  <label
                    className="press"
                    style={withPress(
                      { position: "relative", flex: "none", width: 62, height: 78, border: "1.5px dashed #E3C7C4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "#C3A0A3", padding: 6, cursor: "pointer", transition: "transform .4s cubic-bezier(.32,.72,0,1)" },
                      { "--press-scale": "scale(.92)" }
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}
                    />
                    {uploading ? "Subiendo…" : "Subir foto"}
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={LABEL_STYLE}>Nombre</span>
                <input value={form.name} onChange={(e) => campo("name", e.target.value)} placeholder="Conjunto Chenille" style={INPUT_STYLE} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={LABEL_STYLE}>Descripción</span>
                <textarea rows={3} value={form.desc} onChange={(e) => campo("desc", e.target.value)} placeholder="Una línea corta contando por qué te encanta." style={TEXTAREA_STYLE}></textarea>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={LABEL_STYLE}>Composición</span>
                <textarea rows={2} value={form.material} onChange={(e) => campo("material", e.target.value)} placeholder="92% poliéster · 8% elastano" style={TEXTAREA_STYLE}></textarea>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={LABEL_STYLE}>Precio</span>
                  <div style={{ display: "flex", alignItems: "center", height: 50, border: "1px solid #E3C7C4", borderRadius: 14, background: "#FFFFFF", padding: "0 15px", gap: 6 }}>
                    <span style={{ fontSize: 15.5, color: "#C3A0A3" }}>$</span>
                    <input value={form.price} onChange={(e) => campo("price", e.target.value)} inputMode="numeric" placeholder="9990" style={{ flex: 1, width: "100%", border: 0, background: "transparent", fontSize: 15.5, color: "#5B2E36", padding: 0 }} />
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, opacity: form.oferta ? 1 : 0.42, pointerEvents: form.oferta ? "auto" : "none", transition: "opacity .4s ease" }}>
                  <span style={{ fontSize: 10, letterSpacing: ".26em", textTransform: "uppercase", color: "#B25C71" }}>Precio oferta</span>
                  <div style={{ display: "flex", alignItems: "center", height: 50, border: `1px solid ${form.oferta ? ACCENT : "#E3C7C4"}`, borderRadius: 14, background: "#FFFFFF", padding: "0 15px", gap: 6, transition: "border-color .4s ease" }}>
                    <span style={{ fontSize: 15.5, color: "#C3A0A3" }}>$</span>
                    <input value={form.precioOferta} onChange={(e) => campo("precioOferta", e.target.value)} inputMode="numeric" placeholder="7990" style={{ flex: 1, width: "100%", border: 0, background: "transparent", fontSize: 15.5, color: "#B25C71", padding: 0 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#EFD9D5", borderRadius: 16, padding: "14px 16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>En oferta</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#8E5A62", textDecoration: ofertaViva ? "line-through" : "none" }}>{fmt(fPrecio)}</span>
                    {ofertaViva && <span style={{ fontSize: 14, fontWeight: 600, color: ACCENT }}>{fmt(fOfertaNum)}</span>}
                    {ofertaViva && <span style={{ fontSize: 10, letterSpacing: ".1em", padding: "3px 8px", borderRadius: 999, background: "#5B2E36", color: "#FDF7F5" }}>{"-" + Math.round((1 - fOfertaNum / fPrecio) * 100) + "%"}</span>}
                  </div>
                </div>
                <button onClick={() => campo("oferta", !form.oferta)} style={{ width: 52, height: 31, flex: "none", border: 0, borderRadius: 999, background: form.oferta ? ACCENT : "#E3C7C4", cursor: "pointer", padding: 3, display: "flex", transition: "background .4s cubic-bezier(.32,.72,0,1)" }}>
                  <span style={{ width: 25, height: 25, borderRadius: "50%", background: "#FDF7F5", boxShadow: "0 1px 4px rgba(91,46,54,.28)", transform: `translateX(${form.oferta ? "21px" : "0px"})`, transition: "transform .48s cubic-bezier(.34,1.5,.64,1)" }}></span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={LABEL_STYLE}>Tallas</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {TALLAS.map((t) => {
                    const on = form.tallasSel.indexOf(t) > -1;
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTalla(t)}
                        className="press"
                        style={withPress(
                          { minHeight: 40, padding: "0 15px", border: `1px solid ${on ? ACCENT : "#E3C7C4"}`, borderRadius: 999, background: on ? ACCENT : "transparent", color: on ? "#FDF7F5" : "#8E5A62", fontSize: 13.5, fontWeight: 600, cursor: "pointer", transition: "transform .4s cubic-bezier(.34,1.5,.64,1),background .35s ease,border-color .35s ease,color .35s ease" },
                          { "--press-scale": "scale(.9)" }
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={LABEL_STYLE}>Colores disponibles</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 34 }}>
                  {form.colores.map((h, i) => (
                    <button
                      key={h + i}
                      onClick={() => delColor(i)}
                      className="press"
                      style={withPress(
                        { width: 34, height: 34, borderRadius: "50%", border: 0, padding: 0, cursor: "pointer", background: h, boxShadow: "inset 0 0 0 1px rgba(91,46,54,.16)", animation: "adminIn .5s cubic-bezier(.34,1.5,.64,1) both", transition: "transform .4s cubic-bezier(.32,.72,0,1)" },
                        { "--press-scale": "scale(.8)" }
                      )}
                    ></button>
                  ))}
                  {form.colores.length === 0 && <span style={{ alignSelf: "center", fontSize: 12, color: "#C3A0A3" }}>Toca un color de abajo para agregarlo</span>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, borderTop: "1px solid #EBD0CC", paddingTop: 12 }}>
                  {PALETA.map((h) => (
                    <button
                      key={h}
                      onClick={() => addColor(h)}
                      className="press"
                      style={withPress(
                        { width: 28, height: 28, borderRadius: "50%", border: 0, padding: 0, cursor: "pointer", background: h, boxShadow: "inset 0 0 0 1px rgba(91,46,54,.16)", transition: "transform .4s cubic-bezier(.34,1.5,.64,1)" },
                        { "--press-scale": "scale(1.22)" }
                      )}
                    ></button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={LABEL_STYLE}>Stock por talla</span>
                  <span style={{ fontSize: 12, color: "#8E5A62" }}>{form.tallasSel.length ? fStockTotal + (fStockTotal === 1 ? " pieza en total" : " piezas en total") : ""}</span>
                </div>
                {form.tallasSel.length === 0 && <span style={{ fontSize: 12.5, color: "#C3A0A3", lineHeight: 1.5 }}>Elige al menos una talla arriba para cargar stock.</span>}
                {form.tallasSel.map((t) => {
                  const n = form.stock[t] || 0;
                  return (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, background: n === 0 ? "#F7EAE7" : "#FDF7F5", border: "1px solid #EBD0CC", borderRadius: 14, padding: "9px 11px", animation: "adminIn .5s cubic-bezier(.34,1.5,.64,1) both" }}>
                      <span style={{ flex: "none", minWidth: 54, fontSize: 14.5, fontWeight: 600 }}>{t}</span>
                      <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, color: n === 0 ? "#B25C71" : "#A87B81" }}>{n === 0 ? "Agotada — se muestra tachada en la tienda" : n <= 2 ? "La tienda avisa «últimas " + n + "»" : ""}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
                        <button
                          onClick={() => setStock(t, -1)}
                          className="press"
                          style={withPress(
                            { width: 34, height: 34, borderRadius: 17, border: "1px solid #E3C7C4", background: "#FDF7F5", color: "#5B2E36", fontSize: 16, cursor: "pointer", transition: "transform .4s cubic-bezier(.32,.72,0,1),background .3s ease" },
                            { "--press-scale": "scale(.86)", "--press-bg": "#F3E2DE" }
                          )}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 24, textAlign: "center", fontSize: 15, fontWeight: 600 }}>{n}</span>
                        <button
                          onClick={() => setStock(t, 1)}
                          className="press"
                          style={withPress(
                            { width: 34, height: 34, borderRadius: 17, border: "1px solid #E3C7C4", background: "#FDF7F5", color: "#5B2E36", fontSize: 16, cursor: "pointer", transition: "transform .4s cubic-bezier(.32,.72,0,1),background .3s ease" },
                            { "--press-scale": "scale(.86)", "--press-bg": "#F3E2DE" }
                          )}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#EFD9D5", borderRadius: 16, padding: "14px 16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>Publicar en la tienda</span>
                  <span style={{ fontSize: 12, color: "#8E5A62" }}>{form.publicada ? "Se ve en el catálogo al guardar" : "Queda guardada, pero oculta"}</span>
                </div>
                <button onClick={() => campo("publicada", !form.publicada)} style={{ width: 52, height: 31, flex: "none", border: 0, borderRadius: 999, background: form.publicada ? ACCENT : "#E3C7C4", cursor: "pointer", padding: 3, display: "flex", transition: "background .4s cubic-bezier(.32,.72,0,1)" }}>
                  <span style={{ width: 25, height: 25, borderRadius: "50%", background: "#FDF7F5", boxShadow: "0 1px 4px rgba(91,46,54,.28)", transform: `translateX(${form.publicada ? "21px" : "0px"})`, transition: "transform .48s cubic-bezier(.34,1.5,.64,1)" }}></span>
                </button>
              </div>
            </>
          )}

          {sheet === "look" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={LABEL_STYLE}>Nombre del look</span>
                <input value={lform.name} onChange={(e) => lcampo("name", e.target.value)} placeholder="El look completo" style={INPUT_STYLE} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={LABEL_STYLE}>Prendas del look</span>
                {products.map((p) => {
                  const on = lform.ids.indexOf(p.id) > -1;
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleLookId(p.id)}
                      className="press"
                      style={withPress(
                        { display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", border: `1px solid ${on ? ACCENT : "#EBD0CC"}`, background: on ? "#F9EDEA" : "#FDF7F5", borderRadius: 16, padding: "9px 12px", cursor: "pointer", transition: "border-color .4s ease,background .4s ease,transform .4s cubic-bezier(.32,.72,0,1)" },
                        { "--press-scale": "scale(.98)" }
                      )}
                    >
                      <img src={p.img || FALLBACK_IMG} alt="" style={{ width: 44, height: 56, borderRadius: 10, objectFit: "cover", objectPosition: p.imgPos, flex: "none" }} />
                      <span style={{ flex: 1, fontSize: 14.5 }}>{p.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#8E5A62" }}>{fmt(p.price)}</span>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", background: on ? ACCENT : "transparent", boxShadow: "inset 0 0 0 1px #E3C7C4", color: "#FDF7F5", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .4s ease" }}>{on ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={LABEL_STYLE}>Precio del look</span>
                  <div style={{ display: "flex", alignItems: "center", height: 50, border: "1px solid #E3C7C4", borderRadius: 14, background: "#FFFFFF", padding: "0 15px", gap: 6 }}>
                    <span style={{ fontSize: 15.5, color: "#C3A0A3" }}>$</span>
                    <input value={lform.price} onChange={(e) => lcampo("price", e.target.value)} inputMode="numeric" placeholder="17900" style={{ flex: 1, width: "100%", border: 0, background: "transparent", fontSize: 15.5, color: "#5B2E36", padding: 0 }} />
                  </div>
                </div>
                <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end", paddingBottom: 6 }}>
                  <span style={{ fontSize: 11.5, color: "#C99AA4", textDecoration: "line-through" }}>{fmt(lsuma)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>{loff}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ flex: "none", padding: "14px 16px 22px", borderTop: "1px solid #EBD0CC", background: "rgba(253,247,245,.94)", backdropFilter: "blur(14px)", display: "flex", gap: 10 }}>
          <button
            onClick={cerrar}
            className="press"
            style={withPress(
              { width: 52, height: 52, borderRadius: 26, border: "1px solid #E3C7C4", background: "transparent", color: "#8E5A62", fontSize: 17, cursor: "pointer", transition: "transform .45s cubic-bezier(.32,.72,0,1),background .3s ease" },
              { "--press-scale": "scale(.92)", "--press-bg": "#F3E2DE" }
            )}
          >
            ✕
          </button>
          <button
            onClick={guardar}
            className="press"
            style={withPress(
              { flex: 1, height: 52, borderRadius: 26, border: 0, background: "#5B2E36", color: "#FDF7F5", fontSize: 15.5, fontWeight: 600, cursor: "pointer", transition: "transform .45s cubic-bezier(.32,.72,0,1),background .4s ease" },
              { "--press-scale": "scale(.972)" }
            )}
          >
            {guardarLabel}
          </button>
        </div>
      </div>

      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 26, zIndex: 90, display: "flex", justifyContent: "center",
          pointerEvents: "none", opacity: toastOn ? 1 : 0, transform: `translateY(${toastOn ? "0px" : "26px"})`,
          transition: "opacity .4s ease,transform .55s cubic-bezier(.34,1.4,.64,1)",
        }}
      >
        <span style={{ background: "#5B2E36", color: "#FDF7F5", fontSize: 13.5, letterSpacing: ".02em", padding: "13px 22px", borderRadius: 999, boxShadow: "0 12px 30px rgba(91,46,54,.32)" }}>{toast}</span>
      </div>
    </div>
  );
}
