"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { downloadOrderPdf } from "@/lib/pdf";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

export interface Product {
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
}

export interface Look {
  id: string;
  name: string;
  productIds: string[];
  price: number;
}

interface CartItem {
  id: string;
  talla: string;
  qty: number;
}

interface FlipState {
  src: string;
  pos: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

interface GalPrev {
  src: string;
  pos: string;
}

const ACCENT = "#B25C71";
const ACCENT_SOFT = "#E9B6C2";

const PASOS: { n: string; titulo: string; texto: string }[] = [
  {
    n: "1",
    titulo: "Elige tu talla",
    texto: "Cada prenda muestra las medidas reales en cm y cuántas quedan. Si dudas, escríbenos antes de comprar.",
  },
  {
    n: "2",
    titulo: "Nos escribes por WhatsApp",
    texto: "Tu carrito llega con todo listo: prendas, tallas y total. No tienes que escribir nada.",
  },
  {
    n: "3",
    titulo: "Transferencia y despacho",
    texto: "Te enviamos los datos y despachamos el mismo día por Starken o Bluexpress.",
  },
];

const GARANTIAS: { txt: string }[] = [
  { txt: "Si la prenda venía con falla, el envío del cambio lo pagamos nosotras." },
  { txt: "Si es cambio de talla, compartimos el costo del despacho." },
  { txt: "Todo lo que ves en las fotos lo probamos antes de subirlo." },
];

const EMPTY_PRODUCT: Product = {
  id: "",
  name: "",
  desc: "",
  material: "",
  price: 0,
  offerPrice: null,
  sizes: [],
  stock: {},
  colors: [],
  img: "",
  imgPos: "center",
  published: true,
};

type PressVar = "--press-scale" | "--press-bg" | "--press-opacity" | "--press-color" | "--press-border";

function press(vars: Partial<Record<PressVar, string>>): CSSProperties {
  return vars as CSSProperties;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

function sellPrice(p: Product): number {
  return p.offerPrice ?? p.price;
}

function viewsFor(item: Product): string[] {
  return [item.imgPos, "center 20%", "center 52%", "center 76%"];
}

// --- Réplica del motor de scroll-reveal del diseño original (scan/reveal/paint) ---
// Trabaja directamente sobre el DOM vía atributos data-reveal/data-delay/data-to,
// igual que el Component original — no usa estado de React.
function paintReveal(el: HTMLElement) {
  if (el.dataset.rev === "1") {
    el.style.transitionDelay = (el.dataset.delay || "0") + "ms";
    el.style.opacity = "1";
    el.style.transform = el.dataset.to || "translateY(0)";
  } else if (el.dataset.rev === "0") {
    el.style.transitionDelay = "0ms";
    el.style.opacity = el.dataset.op0 || "1";
    el.style.transform = el.dataset.from || "none";
  }
}

function scanReveal() {
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (!el.dataset.seen) {
      el.dataset.seen = "1";
      el.dataset.from = el.style.transform || "none";
      el.dataset.op0 = el.style.opacity || "1";
    }
    paintReveal(el);
  });
}

function checkReveal() {
  const h = window.innerHeight;
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    const r = el.getBoundingClientRect();
    const dentro = r.top < h * 0.94 && r.bottom > 0;
    const v = dentro ? "1" : "0";
    if (el.dataset.rev !== v) {
      el.dataset.rev = v;
      paintReveal(el);
    }
  });
}

const FAVORITES_KEY = "eden-shop-favoritos";

export default function Store({
  products,
  looks,
  tickerText,
  whatsappNumber,
}: {
  products: Product[];
  looks: Look[];
  tickerText: string;
  whatsappNumber: string;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sheetState, setSheetState] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [lookAdded, setLookAdded] = useState<string | null>(null);
  const [hero, setHero] = useState(0);
  const [badge, setBadge] = useState(1);
  const [scrolled, setScrolled] = useState(false);
  const [flip, setFlip] = useState<FlipState | null>(null);
  const [flipOn, setFlipOn] = useState(false);
  const [gal, setGal] = useState(0);
  const [prev, setPrev] = useState<GalPrev | null>(null);
  const [prevO, setPrevO] = useState(0);
  const [galScale, setGalScale] = useState(1);
  const [talla, setTallaState] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);
  const [avisada, setAvisada] = useState(false);
  const [comoOn, setComoOn] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const flipTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisoTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookTRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Favoritos: viven solo en el navegador de la clienta (localStorage), no en la base de datos.
  // Se hidratan tras el montaje a propósito (SSR no tiene acceso a localStorage).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única desde localStorage tras montar, no hay alternativa sin desajuste de SSR
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
    } catch {
      // localStorage no disponible o dato corrupto: seguimos sin favoritos guardados.
    }
  }, []);

  function toggleFavorite(id: string, e?: MouseEvent<HTMLButtonElement>) {
    e?.stopPropagation();
    setFavorites((prevFavs) => {
      const next = new Set(prevFavs);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // si falla el guardado, el toggle sigue funcionando solo para esta sesión.
      }
      return next;
    });
  }

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const validLooks = useMemo(
    () => looks.filter((l) => l.productIds.length > 0 && l.productIds.every((id) => productById.has(id))),
    [looks, productById]
  );

  // scan()+reveal() tras cada render, como componentDidMount/componentDidUpdate del original.
  useEffect(() => {
    scanReveal();
    checkReveal();
  });

  // Scroll listener + parallax del hero, montado una sola vez.
  useEffect(() => {
    let raf = 0;
    let pxImgs: HTMLElement | null = null;
    let pxText: HTMLElement | null = null;
    const onScroll = () => {
      const s = window.scrollY > 20;
      setScrolled((p) => (p !== s ? s : p));
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        checkReveal();
        const y = window.scrollY;
        if (y > 760) return;
        if (!pxImgs) pxImgs = document.querySelector<HTMLElement>("[data-hero-imgs]");
        if (!pxText) pxText = document.querySelector<HTMLElement>("[data-hero-text]");
        if (pxImgs) pxImgs.style.transform = "translate3d(0," + y * 0.2 + "px,0)";
        if (pxText) {
          pxText.style.transform = "translate3d(0," + y * -0.05 + "px,0)";
          pxText.style.opacity = String(Math.max(0, 1 - y / 380));
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.body.style.overflow = "";
    };
  }, []);

  // Bloquea/desbloquea el scroll del body mientras un sheet está abierto.
  useEffect(() => {
    document.body.style.overflow = locked ? "hidden" : "";
  }, [locked]);

  const heroSlides = useMemo(() => products.slice(0, 4).map((p) => ({ src: p.img, pos: p.imgPos })), [products]);
  const heroCount = heroSlides.length;

  // Auto-rotación del hero.
  useEffect(() => {
    if (heroCount < 2) return;
    const id = setInterval(() => {
      setHero((h) => (h + 1) % heroCount);
    }, 5200);
    return () => clearInterval(id);
  }, [heroCount]);

  function enCarro(id: string, t: string) {
    const c = cart.find((x) => x.id === id && x.talla === t);
    return c ? c.qty : 0;
  }

  function quedan(item: Product, t: string | null) {
    if (!item || !t) return 0;
    return Math.max(0, (item.stock[t] || 0) - enCarro(item.id, t));
  }

  function quedanTotal(item: Product) {
    return item.sizes.reduce((n, t) => n + quedan(item, t), 0);
  }

  function openSheet(item: Product, root?: HTMLElement | null) {
    const src = root ? root.querySelector<HTMLElement>("img") : null;
    const r = src ? src.getBoundingClientRect() : null;
    const libres = item.sizes.filter((t) => quedan(item, t) > 0);
    setSheetState(item);
    setSheetOpen(true);
    setCartOpen(false);
    setGal(0);
    setPrev(null);
    setPrevO(0);
    setGalScale(1);
    setTallaState(item.sizes.length === 1 ? item.sizes[0] : libres.length === 1 ? libres[0] : null);
    setNudge(false);
    setAvisada(false);
    setLocked(true);
    if (!r) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(480, vw);
    const tw = w - 32;
    const th = tw * 1.25;
    const tx = (vw - w) / 2 + 16;
    const ty = vh * 0.1 + 26;
    setFlipOn(true);
    setFlip({ src: item.img, pos: item.imgPos, x: r.left, y: r.top, w: r.width, h: r.height, r: 16 });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlip((f) => (f ? { ...f, x: tx, y: ty, w: tw, h: th, r: 18 } : f));
      });
    });
    if (flipTRef.current) clearTimeout(flipTRef.current);
    flipTRef.current = setTimeout(() => setFlipOn(false), 640);
  }

  function openCart() {
    setCartOpen(true);
    setSheetOpen(false);
    setLocked(true);
  }

  function closeAll() {
    setSheetOpen(false);
    setCartOpen(false);
    setConfirmOpen(false);
    setLocked(false);
  }

  function pickGal(i: number) {
    if (i === gal) return;
    const item = sheetState ?? products[0] ?? EMPTY_PRODUCT;
    const cur = viewsFor(item)[gal];
    setPrev({ src: item.img, pos: cur });
    setPrevO(1);
    setGal(i);
    setGalScale(1.06);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPrevO(0);
        setGalScale(1);
      });
    });
    if (galTRef.current) clearTimeout(galTRef.current);
    galTRef.current = setTimeout(() => setPrev(null), 560);
  }

  function pop() {
    setBadge(1.32);
    if (badgeTRef.current) clearTimeout(badgeTRef.current);
    badgeTRef.current = setTimeout(() => setBadge(1), 190);
  }

  function add(item: Product, t: string | null) {
    if (!t || quedan(item, t) < 1) return;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id && c.talla === t);
      if (idx > -1) {
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { id: item.id, talla: t, qty: 1 }];
    });
    setAdded(item.id);
    pop();
    if (addedTRef.current) clearTimeout(addedTRef.current);
    addedTRef.current = setTimeout(() => setAdded(null), 1500);
  }

  function pedirTalla() {
    setNudge(true);
    if (nudgeTRef.current) clearTimeout(nudgeTRef.current);
    nudgeTRef.current = setTimeout(() => setNudge(false), 520);
  }

  function avisarme() {
    setAvisada(true);
    if (avisoTRef.current) clearTimeout(avisoTRef.current);
    avisoTRef.current = setTimeout(() => setAvisada(false), 2600);
  }

  function pickTalla(t: string) {
    setTallaState(t);
    setNudge(false);
    setAvisada(false);
  }

  function desdeCard(item: Product, e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const libres = item.sizes.filter((t) => quedan(item, t) > 0);
    if (libres.length === 1) {
      add(item, libres[0]);
    } else {
      openSheet(item, (e.currentTarget as HTMLElement).parentElement);
    }
  }

  function addLook(look: Look) {
    look.productIds.forEach((pid) => {
      const product = productById.get(pid);
      if (!product) return;
      const withStock = product.sizes.find((s) => (product.stock[s] || 0) > 0);
      const size = withStock ?? product.sizes[0];
      if (size) add(product, size);
    });
    setLookAdded(look.id);
    if (lookTRef.current) clearTimeout(lookTRef.current);
    lookTRef.current = setTimeout(() => setLookAdded(null), 1600);
  }

  function step(id: string, t: string, d: number) {
    if (d > 0) {
      const item = productById.get(id);
      if (!item || quedan(item, t) < 1) return;
    }
    setCart((prev) => {
      let next = prev.map((c) => (c.id === id && c.talla === t ? { ...c, qty: c.qty + d } : c));
      next = next.filter((c) => c.qty > 0);
      return next;
    });
  }

  async function handleWhatsAppOrder() {
    if (cart.length === 0 || ordering) return;
    setOrderError(null);
    const lineItems = cart
      .map((c) => {
        const p = productById.get(c.id);
        if (!p) return null;
        return { productId: p.id, name: p.name, talla: c.talla, qty: c.qty, price: sellPrice(p) };
      })
      .filter((x): x is { productId: string; name: string; talla: string; qty: number; price: number } => x !== null);
    if (lineItems.length === 0) return;
    setOrdering(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lineItems }),
      });
      if (!res.ok) throw new Error("No pudimos crear el pedido");
      const data = (await res.json()) as { orderNumber: number; id: string };
      const orderTotal = lineItems.reduce((n, i) => n + i.price * i.qty, 0);
      downloadOrderPdf({
        orderNumber: data.orderNumber,
        items: lineItems.map((i) => ({ name: i.name, talla: i.talla, qty: i.qty, price: i.price })),
        total: orderTotal,
        fmt,
      });
      const waLink = buildWhatsAppOrderLink({
        orderNumber: data.orderNumber,
        items: lineItems.map((i) => ({ name: i.name, talla: i.talla, qty: i.qty, line: fmt(i.price * i.qty) })),
        total: fmt(orderTotal),
        whatsappNumber,
      });
      window.open(waLink, "_blank");
      setConfirmOpen(false);
      closeAll();
    } catch {
      setOrderError("No pudimos preparar tu pedido. Intenta de nuevo.");
    } finally {
      setOrdering(false);
    }
  }

  // --- Valores derivados para el render ---
  const accent = ACCENT;
  const accentSoft = ACCENT_SOFT;
  const count = cart.reduce((n, c) => n + c.qty, 0);
  const cartTotal = cart.reduce((n, c) => {
    const p = productById.get(c.id);
    return p ? n + c.qty * sellPrice(p) : n;
  }, 0);

  const activeSheet = sheetState ?? products[0] ?? EMPTY_PRODUCT;
  const hasSheetOffer = activeSheet.offerPrice != null;
  const sheetViews = viewsFor(activeSheet);
  const galPos = sheetViews[gal] || activeSheet.imgPos;
  const thumbs = sheetViews.map((v, i) => ({
    src: activeSheet.img,
    pos: v,
    delay: `${260 + i * 95}ms`,
    ring: i === gal ? `2px ${accent}` : "0px rgba(0,0,0,0)",
    dim: i === gal ? 1 : 0.62,
    scale: i === gal ? 1 : 0.965,
  }));

  const restan = talla ? quedan(activeSheet, talla) : 0;
  const agotadaTalla = !!talla && restan === 0;
  let stockNota = `Quedan ${quedanTotal(activeSheet)} piezas · elige tu talla`;
  let stockColor = "#A87B81";
  if (agotadaTalla) {
    stockNota = `Talla ${talla} agotada — te avisamos cuando llegue.`;
    stockColor = accent;
  } else if (talla && restan <= 2) {
    stockNota = `Últimas ${restan} en talla ${talla}.`;
    stockColor = accent;
  } else if (talla) {
    stockNota = `Disponible en talla ${talla} · despacho hoy.`;
    stockColor = "#8E5A62";
  }

  let sheetBtnLabel = "Agregar al carrito";
  let sheetBtnBg = "#5B2E36";
  let sheetBtnAction: () => void = () => {
    add(activeSheet, talla);
    closeAll();
  };
  if (!talla) {
    sheetBtnLabel = "Elige tu talla";
    sheetBtnBg = "#C99AA4";
    sheetBtnAction = pedirTalla;
  } else if (agotadaTalla) {
    sheetBtnLabel = avisada ? "Te avisamos ✓" : "Avísame cuando llegue";
    sheetBtnBg = avisada ? accent : "#8E5A62";
    sheetBtnAction = avisarme;
  } else if (added === activeSheet.id) {
    sheetBtnLabel = "Agregado al carrito ✓";
    sheetBtnBg = accent;
  }

  const feed = products.length > 0 ? Array.from({ length: 4 }, (_, i) => products[i % products.length]) : [];

  return (
    <div className="eden-shell" style={{ background: "#FDF7F5", minHeight: "100vh", overflowX: "hidden", position: "relative" }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(253,247,245,.82)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderBottom: `1px solid ${scrolled ? "#EBD0CC" : "rgba(235,208,204,0)"}`,
          transition: "border-color .4s cubic-bezier(.32,.72,0,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              transformOrigin: "left center",
              transform: `scale(${scrolled ? 0.93 : 1})`,
              transition: "transform .6s cubic-bezier(.32,.72,0,1)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontFamily: "'Italiana',Georgia,serif", fontSize: 29, lineHeight: 1, letterSpacing: ".17em" }}>EDEN SHOP</span>
              <span style={{ fontSize: 8.5, letterSpacing: ".34em", textTransform: "uppercase", color: "#A87B81" }}>Tienda online · Chile</span>
            </div>
          </div>
          <button
            className="press"
            onClick={openCart}
            style={{
              position: "relative",
              border: 0,
              background: "transparent",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "transform .45s cubic-bezier(.32,.72,0,1)",
              ...press({ "--press-scale": "scale(.9)" }),
            }}
          >
            <span style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src="/brand/eden-cart.png"
                alt="Carrito"
                style={{ width: 52, height: 52, objectFit: "contain", filter: "hue-rotate(-24deg) saturate(1.15)" }}
              />
            </span>
            <span style={{ fontSize: 8.5, letterSpacing: ".22em", textTransform: "uppercase", color: "#8E5A62" }}>Carrito</span>
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -6,
                minWidth: 21,
                height: 21,
                padding: "0 6px",
                borderRadius: 11,
                background: accent,
                color: "#FFF",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #FDF7F5",
                opacity: count > 0 ? 1 : 0,
                transform: `scale(${badge})`,
                transition: "transform .38s cubic-bezier(.34,1.56,.64,1),opacity .3s ease",
              }}
            >
              {count}
            </span>
          </button>
        </div>
      </header>

      {/* Ticker */}
      <div style={{ overflow: "hidden", background: "#5B2E36", color: "#FDF7F5", padding: "9px 0" }}>
        <div style={{ display: "flex", width: "max-content", animation: "edenTicker 26s linear infinite" }}>
          {[0, 1].map((k) => (
            <div
              key={k}
              style={{
                display: "flex",
                gap: 34,
                flex: "none",
                paddingRight: 34,
                fontSize: 10.5,
                letterSpacing: ".24em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tickerText}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section style={{ position: "relative", height: 560, overflow: "hidden", background: "#EFD9D5" }}>
        <div data-hero-imgs style={{ position: "absolute", inset: 0, willChange: "transform" }}>
          {heroSlides.map((slide, i) => (
            <img
              key={i}
              src={slide.src}
              alt="Eden Store"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: slide.pos,
                opacity: hero === i ? 1 : 0,
                transform: `scale(${hero === i ? 1.07 : 1})`,
                transition: "opacity 1.4s cubic-bezier(.4,0,.2,1),transform 7s linear",
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom,rgba(91,46,54,.28) 0%,rgba(91,46,54,0) 32%,rgba(91,46,54,.06) 55%,rgba(91,46,54,.62) 100%)",
          }}
        />
        <div
          data-hero-text
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            maxWidth: 480,
            padding: "0 22px 30px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            willChange: "transform,opacity",
          }}
        >
          <div>
            <p
              data-reveal
              style={{
                margin: "0 0 6px",
                fontSize: 10,
                letterSpacing: ".32em",
                textTransform: "uppercase",
                color: "rgba(253,247,245,.78)",
                opacity: 0,
                transform: "translateY(12px)",
                transition: "opacity .8s cubic-bezier(.32,.72,0,1),transform .8s cubic-bezier(.32,.72,0,1)",
              }}
            >
              Otoño · Invierno 26
            </p>
            <h1 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 44, lineHeight: 1.02, color: "#FDF7F5", fontWeight: 400 }}>
              <span style={{ display: "block", overflow: "hidden", paddingBottom: 7, marginBottom: -7 }}>
                <span
                  data-reveal
                  data-delay="90"
                  style={{
                    display: "block",
                    opacity: 0,
                    transform: "translateY(106%)",
                    transition: "opacity .7s ease,transform 1.05s cubic-bezier(.32,.72,0,1)",
                  }}
                >
                  Tu ropa favorita,
                </span>
              </span>
              <span style={{ display: "block", overflow: "hidden", paddingBottom: 7, marginBottom: -7 }}>
                <span
                  data-reveal
                  data-delay="210"
                  style={{
                    display: "block",
                    opacity: 0,
                    transform: "translateY(106%)",
                    transition: "opacity .7s ease,transform 1.05s cubic-bezier(.32,.72,0,1)",
                  }}
                >
                  <em style={{ fontStyle: "italic" }}>sin salir de casa</em>
                </span>
              </span>
            </h1>
          </div>
          <div
            data-reveal
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: 0,
              transform: "translateY(22px)",
              transition: "opacity .9s cubic-bezier(.32,.72,0,1) .12s,transform .9s cubic-bezier(.32,.72,0,1) .12s",
            }}
          >
            <a
              href="#catalogo"
              className="press"
              style={{
                flex: 1,
                height: 50,
                borderRadius: 25,
                background: "#FDF7F5",
                color: "#5B2E36",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 500,
                transition: "transform .45s cubic-bezier(.32,.72,0,1)",
                ...press({ "--press-scale": "scale(.955)" }),
              }}
            >
              Ver el catálogo
            </a>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                border: "1px solid rgba(253,247,245,.42)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FDF7F5",
                fontSize: 17,
                animation: "edenBob 2.8s ease-in-out infinite",
              }}
            >
              ↓
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <section id="catalogo" style={{ padding: "44px 16px 8px" }}>
        <div
          data-reveal
          style={{
            opacity: 0,
            transform: "translateY(22px)",
            transition: "opacity .8s cubic-bezier(.32,.72,0,1),transform .8s cubic-bezier(.32,.72,0,1)",
            padding: "0 6px 20px",
          }}
        >
          <p style={{ margin: "0 0 7px", fontSize: 10, letterSpacing: ".3em", textTransform: "uppercase", color: "#A87B81" }}>
            Catálogo · {products.length} {products.length === 1 ? "prenda" : "prendas"}
          </p>
          <h2 style={{ margin: "0 0 8px", fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 31, lineHeight: 1.1, fontWeight: 400 }}>
            Lo que tenemos hoy
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "#8E5A62", maxWidth: "33ch", textWrap: "pretty" }}>
            Poquitas piezas, elegidas con calma. Toca cualquiera para ver los detalles.
          </p>
        </div>
        <div className="eden-grid">
          {products.map((p, i) => {
            const libre = quedanTotal(p);
            const badgeShow = libre <= 2;
            const badgeText = libre === 0 ? "Agotado" : `Últimas ${libre}`;
            const isAdded = added === p.id;
            const hasOffer = p.offerPrice != null;
            return (
              <div
                key={p.id}
                id={`producto-${p.id}`}
                data-reveal
                data-delay={i * 90}
                className="press"
                onClick={(e) => openSheet(p, e.currentTarget)}
                style={{
                  opacity: 0,
                  transform: "translateY(24px)",
                  cursor: "pointer",
                  transition: "opacity .8s cubic-bezier(.32,.72,0,1),transform .55s cubic-bezier(.32,.72,0,1)",
                  ...press({ "--press-scale": "scale(.962)" }),
                }}
              >
                <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#EFD9D5", aspectRatio: "3/4" }}>
                  <img
                    data-reveal
                    data-to="scale(1)"
                    data-delay={i * 90}
                    src={p.img}
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: p.imgPos,
                      transform: "scale(1.12)",
                      transition: "transform 1.6s cubic-bezier(.22,.61,.36,1)",
                    }}
                  />
                  {badgeShow && (
                    <span
                      style={{
                        position: "absolute",
                        left: 9,
                        top: 9,
                        padding: "5px 10px",
                        borderRadius: 12,
                        background: "rgba(91,46,54,.42)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        color: "#FDF7F5",
                        fontSize: 10,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                      }}
                    >
                      {badgeText}
                    </span>
                  )}
                  <button
                    className="press"
                    onClick={(e) => desdeCard(p, e)}
                    style={{
                      position: "absolute",
                      right: 9,
                      bottom: 9,
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      border: 0,
                      background: isAdded ? accent : "#5B2E36",
                      color: "#FDF7F5",
                      fontSize: 17,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(91,46,54,.24)",
                      transition: "transform .42s cubic-bezier(.34,1.56,.64,1),background .35s ease",
                      ...press({ "--press-scale": "scale(.84)" }),
                    }}
                  >
                    {isAdded ? "✓" : "+"}
                  </button>
                  <button
                    className="press"
                    onClick={(e) => toggleFavorite(p.id, e)}
                    aria-label={favorites.has(p.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                    style={{
                      position: "absolute",
                      right: 9,
                      top: 9,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      border: 0,
                      background: "rgba(91,46,54,.42)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      color: favorites.has(p.id) ? accent : "#FDF7F5",
                      fontSize: 15,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "transform .4s cubic-bezier(.34,1.56,.64,1),color .3s ease",
                      ...press({ "--press-scale": "scale(.8)" }),
                    }}
                  >
                    {favorites.has(p.id) ? "♥" : "♡"}
                  </button>
                </div>
                <div style={{ padding: "11px 3px 0", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 15, lineHeight: 1.25, letterSpacing: ".01em" }}>{p.name}</span>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                    {hasOffer && <span style={{ fontSize: 12, color: "#C99AA4", textDecoration: "line-through" }}>{fmt(p.price)}</span>}
                    <span style={{ fontSize: 14.5, fontWeight: 500, color: hasOffer ? accent : undefined }}>{fmt(sellPrice(p))}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Look completo (uno por cada Look válido) */}
      {validLooks.map((look) => {
        const memberProducts = look.productIds.map((id) => productById.get(id)!);
        const names = memberProducts.map((p) => p.name).join(" + ");
        const sumBefore = memberProducts.reduce((n, p) => n + p.price, 0);
        const isAdded = lookAdded === look.id;
        const [img1, img2] = memberProducts;
        return (
          <section key={look.id} style={{ padding: "46px 16px 6px", maxWidth: 560, margin: "0 auto" }}>
            <div
              data-reveal
              style={{
                opacity: 0,
                transform: "translateY(24px)",
                transition: "opacity .8s cubic-bezier(.32,.72,0,1),transform .8s cubic-bezier(.32,.72,0,1)",
                background: "#5B2E36",
                borderRadius: 22,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "24px 20px 18px" }}>
                <p style={{ margin: "0 0 7px", fontSize: 10, letterSpacing: ".3em", textTransform: "uppercase", color: accentSoft }}>
                  Look completo
                </p>
                <h2 style={{ margin: "0 0 8px", fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 29, lineHeight: 1.1, color: "#FDF7F5", fontWeight: 400 }}>
                  {look.name}
                </h2>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#C99AA4", maxWidth: "34ch", textWrap: "pretty" }}>{names}</p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: img2 ? "1fr 1fr" : "1fr",
                  gap: 2,
                  padding: "0 2px",
                }}
              >
                <img
                  data-reveal
                  data-to="scale(1)"
                  src={img1.img}
                  alt={img1.name}
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    objectFit: "cover",
                    objectPosition: img1.imgPos,
                    borderRadius: img2 ? "14px 4px 4px 4px" : 14,
                    transform: "scale(1.1)",
                    transition: "transform 1.7s cubic-bezier(.22,.61,.36,1)",
                  }}
                />
                {img2 && (
                  <img
                    data-reveal
                    data-to="scale(1)"
                    data-delay="120"
                    src={img2.img}
                    alt={img2.name}
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                      objectFit: "cover",
                      objectPosition: img2.imgPos,
                      borderRadius: "4px 14px 4px 4px",
                      transform: "scale(1.1)",
                      transition: "transform 1.7s cubic-bezier(.22,.61,.36,1)",
                    }}
                  />
                )}
              </div>
              <div style={{ padding: "18px 20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                  <span style={{ fontSize: 12, color: "#C99AA4", textDecoration: "line-through" }}>{fmt(sumBefore)}</span>
                  <span style={{ fontSize: 19, color: "#FDF7F5", fontWeight: 500 }}>{fmt(look.price)}</span>
                </div>
                <button
                  className="press"
                  onClick={() => addLook(look)}
                  style={{
                    height: 48,
                    padding: "0 22px",
                    border: 0,
                    borderRadius: 24,
                    background: isAdded ? "#E9B6C2" : "#FDF7F5",
                    color: "#5B2E36",
                    fontSize: 14.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "transform .45s cubic-bezier(.32,.72,0,1),background .35s ease",
                    ...press({ "--press-scale": "scale(.955)" }),
                  }}
                >
                  {isAdded ? "Agregado ✓" : "Llevar el look"}
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {/* ¿Cómo comprar? */}
      <section style={{ padding: "40px 16px 4px" }}>
        <div
          data-reveal
          style={{
            opacity: 0,
            transform: "translateY(20px)",
            transition: "opacity .8s cubic-bezier(.32,.72,0,1),transform .8s cubic-bezier(.32,.72,0,1)",
            border: "1px solid #EBD0CC",
            borderRadius: 20,
            overflow: "hidden",
            background: "#FDF7F5",
          }}
        >
          <button
            className="press"
            onClick={() => setComoOn((v) => !v)}
            style={{
              width: "100%",
              minHeight: 64,
              border: 0,
              background: "transparent",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "background .35s ease",
              ...press({ "--press-bg": "#F7EAE7" }),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src="/brand/duda.png"
                alt=""
                style={{ width: 44, height: 44, objectFit: "contain", flex: "none", filter: "hue-rotate(-24deg) saturate(1.15)" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 22, lineHeight: 1.1, color: "#5B2E36" }}>¿Cómo comprar?</span>
                <span style={{ fontSize: 12.5, color: "#A87B81" }}>Tres pasos, cambios y despacho</span>
              </div>
            </div>
            <span
              style={{
                flex: "none",
                width: 34,
                height: 34,
                borderRadius: 17,
                background: "#EFD9D5",
                color: "#5B2E36",
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `rotate(${comoOn ? "180deg" : "0deg"})`,
                transition: "transform .55s cubic-bezier(.32,.72,0,1)",
              }}
            >
              ↓
            </span>
          </button>
          <div
            style={{
              maxHeight: comoOn ? 760 : 0,
              opacity: comoOn ? 1 : 0,
              overflow: "hidden",
              transition: "max-height .65s cubic-bezier(.32,.72,0,1),opacity .5s ease",
            }}
          >
            <div style={{ padding: "2px 20px 22px", display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {PASOS.map((s) => (
                  <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span
                      style={{
                        flex: "none",
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        background: "#EFD9D5",
                        color: "#5B2E36",
                        fontFamily: "'Instrument Serif',Georgia,serif",
                        fontSize: 17,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {s.n}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{s.titulo}</span>
                      <span style={{ fontSize: 14, lineHeight: 1.55, color: "#8E5A62", textWrap: "pretty" }}>{s.texto}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#F7EAE7", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 21, lineHeight: 1.14, fontWeight: 400 }}>
                  ¿Y si no me queda?
                </h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "#8E5A62", textWrap: "pretty" }}>
                  Lo cambiamos. Tienes 7 días desde que recibes tu pedido para cambiar talla o color, con etiqueta y sin uso.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 2 }}>
                  {GARANTIAS.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ flex: "none", color: accent, fontSize: 14, lineHeight: 1.5 }}>✓</span>
                      <span style={{ fontSize: 14, lineHeight: 1.5, color: "#5B2E36", textWrap: "pretty" }}>{g.txt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre nosotras */}
      <section style={{ padding: "34px 22px 10px" }}>
        <div
          data-reveal
          style={{
            opacity: 0,
            transform: "translateY(22px)",
            transition: "opacity .8s cubic-bezier(.32,.72,0,1),transform .8s cubic-bezier(.32,.72,0,1)",
          }}
        >
          <p style={{ margin: "0 0 7px", fontSize: 10, letterSpacing: ".3em", textTransform: "uppercase", color: "#A87B81" }}>Sobre nosotras</p>
          <h2
            style={{
              margin: "0 0 12px",
              fontFamily: "'Instrument Serif',Georgia,serif",
              fontSize: 29,
              lineHeight: 1.14,
              fontWeight: 400,
              textWrap: "pretty",
            }}
          >
            Eden Shop es chiquita, y así nos gusta
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.62, color: "#8E5A62", textWrap: "pretty" }}>
            Somos una tienda 100% online. Compramos poquito de cada prenda — por eso ves cuántas quedan — y la probamos antes de subirla. Si algo
            no te queda bien, lo conversamos.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 16, overflow: "hidden", background: "#EBD0CC" }}>
            {[
              { a: "Envío express", b: "24 a 48 horas" },
              { a: "Starken", b: "Retiro en sucursal" },
              { a: "Bluexpress", b: "A todo Chile" },
              { a: "WhatsApp", b: "+56 9 4631 2281" },
            ].map((row) => (
              <div
                key={row.a}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "#FDF7F5",
                  padding: "15px 17px",
                }}
              >
                <span style={{ fontSize: 14.5 }}>{row.a}</span>
                <span style={{ fontSize: 12.5, color: "#A87B81" }}>{row.b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section style={{ padding: "46px 16px 30px" }}>
        <div
          data-reveal
          style={{
            opacity: 0,
            transform: "translateY(22px)",
            transition: "opacity .8s cubic-bezier(.32,.72,0,1),transform .8s cubic-bezier(.32,.72,0,1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, padding: "0 6px 16px" }}>
            <div>
              <p style={{ margin: "0 0 5px", fontSize: 10, letterSpacing: ".3em", textTransform: "uppercase", color: "#A87B81" }}>Instagram</p>
              <h2 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 27, lineHeight: 1.1, fontWeight: 400 }}>
                @eden.shop._
              </h2>
            </div>
            <a
              href="https://www.instagram.com/eden.shop._?igsi=OTU0cTJ5Yzl0czA5"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13.5, borderBottom: "1px solid #E3C7C4", paddingBottom: 2 }}
            >
              Seguir
            </a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {feed.map((p, i) => (
              <img
                key={i}
                className="press"
                src={p.img}
                alt="Eden Store en Instagram"
                style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  objectFit: "cover",
                  objectPosition: p.imgPos,
                  borderRadius: 10,
                  transition: "transform .5s cubic-bezier(.32,.72,0,1),opacity .4s ease",
                  ...press({ "--press-scale": "scale(.96)", "--press-opacity": ".86" }),
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "30px 22px 46px", borderTop: "1px solid #EBD0CC", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ position: "relative", width: 104, height: 106, marginBottom: 2 }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 7,
              width: 46,
              height: 8,
              marginLeft: -23,
              borderRadius: "50%",
              background: "rgba(91,46,54,.45)",
              filter: "blur(3.5px)",
              animation: "edenShade 1.9s ease-in-out infinite",
            }}
          />
          <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", animation: "edenHop 1.9s ease-in-out infinite" }}>
            <img
              src="/brand/eden-logo.png"
              alt="Eden Store"
              style={{
                position: "absolute",
                left: "50%",
                bottom: 9,
                width: 68,
                marginLeft: -34,
                filter: "hue-rotate(-24deg) saturate(1.15)",
                animation: "edenFrameA 1.9s steps(1,end) infinite",
              }}
            />
            <img
              src="/brand/eden-jump.png"
              alt=""
              style={{
                position: "absolute",
                left: "50%",
                bottom: 0,
                width: 70,
                marginLeft: -35,
                filter: "hue-rotate(-24deg) saturate(1.15)",
                opacity: 0,
                animation: "edenFrameB 1.9s steps(1,end) infinite",
              }}
            />
          </div>
        </div>
        <span style={{ fontFamily: "'Italiana',Georgia,serif", fontSize: 22, letterSpacing: ".17em" }}>EDEN SHOP</span>
        <span style={{ fontSize: 12.5, color: "#A87B81", lineHeight: 1.6 }}>
          +56 9 4631 2281 · envíos a domicilio
          <br />
          Hecho con cariño en Chile · Precios en CLP
        </span>
      </footer>

      {/* Flip overlay */}
      {flipOn && (
        <div
          style={{
            position: "fixed",
            zIndex: 75,
            left: (flip?.x ?? 0) + "px",
            top: (flip?.y ?? 0) + "px",
            width: (flip?.w ?? 0) + "px",
            height: (flip?.h ?? 0) + "px",
            borderRadius: (flip?.r ?? 16) + "px",
            overflow: "hidden",
            pointerEvents: "none",
            transition:
              "left .6s cubic-bezier(.32,.72,0,1),top .6s cubic-bezier(.32,.72,0,1),width .6s cubic-bezier(.32,.72,0,1),height .6s cubic-bezier(.32,.72,0,1),border-radius .6s cubic-bezier(.32,.72,0,1)",
          }}
        >
          <img src={flip?.src ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: flip?.pos ?? "center" }} />
        </div>
      )}

      {/* Backdrop */}
      <div
        onClick={closeAll}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(91,46,54,.46)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          opacity: sheetOpen || cartOpen ? 1 : 0,
          pointerEvents: sheetOpen || cartOpen ? "auto" : "none",
          transition: "opacity .5s cubic-bezier(.32,.72,0,1)",
        }}
      />

      {/* Sheet de producto */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 70,
          margin: "0 auto",
          maxWidth: 480,
          height: "90vh",
          background: "#FDF7F5",
          borderRadius: "26px 26px 0 0",
          boxShadow: "0 -18px 60px rgba(91,46,54,.28)",
          transform: `translateY(${sheetOpen ? "0%" : "102%"})`,
          transition: "transform .58s cubic-bezier(.32,.72,0,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flex: "none" }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: "#E3C7C4" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "8px 16px 0" }}>
            <div
              style={{
                position: "relative",
                aspectRatio: "4/5",
                borderRadius: 18,
                overflow: "hidden",
                background: "#EFD9D5",
                opacity: flipOn ? 0 : 1,
                transition: "opacity .3s ease",
              }}
            >
              <img
                src={activeSheet.img}
                alt={activeSheet.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: galPos,
                  transform: `scale(${galScale})`,
                  transition: "transform .95s cubic-bezier(.22,.61,.36,1)",
                }}
              />
              {prev && (
                <img
                  src={prev.src}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: prev.pos,
                    opacity: prevO,
                    transition: "opacity .52s cubic-bezier(.32,.72,0,1)",
                  }}
                />
              )}
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  bottom: 12,
                  padding: "5px 10px",
                  borderRadius: 12,
                  background: "rgba(91,46,54,.4)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "#FDF7F5",
                  fontSize: 11,
                  letterSpacing: ".1em",
                }}
              >
                {gal + 1} / 4
              </span>
            </div>
            {sheetOpen && (
              <div style={{ display: "flex", gap: 8, padding: "10px 2px 0", overflowX: "auto" }}>
                {thumbs.map((t, i) => (
                  <button
                    key={i}
                    className="press"
                    onClick={() => pickGal(i)}
                    style={{
                      flex: "none",
                      width: 74,
                      height: 92,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      opacity: 0,
                      animation: `edenArrive .85s cubic-bezier(.22,1.04,.36,1) ${t.delay} both`,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: `0 0 0 ${t.ring}`,
                        transition: "box-shadow .45s cubic-bezier(.32,.72,0,1),transform .45s cubic-bezier(.32,.72,0,1)",
                        transform: `scale(${t.scale})`,
                      }}
                    >
                      <img
                        src={t.src}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: t.pos, opacity: t.dim, transition: "opacity .45s ease" }}
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: "20px 22px 26px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ margin: "0 0 4px", fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 30, lineHeight: 1.08, fontWeight: 400 }}>
                {activeSheet.name}
              </h3>
              <button
                className="press"
                onClick={(e) => toggleFavorite(activeSheet.id, e)}
                aria-label={favorites.has(activeSheet.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                style={{
                  flex: "none",
                  border: 0,
                  background: "transparent",
                  color: favorites.has(activeSheet.id) ? accent : "#C99AA4",
                  fontSize: 24,
                  lineHeight: 1,
                  padding: 4,
                  cursor: "pointer",
                  transition: "transform .4s cubic-bezier(.34,1.56,.64,1),color .3s ease",
                  ...press({ "--press-scale": "scale(.8)" }),
                }}
              >
                {favorites.has(activeSheet.id) ? "♥" : "♡"}
              </button>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8 }}>
              {hasSheetOffer && (
                <span style={{ fontSize: 14, color: "#C99AA4", textDecoration: "line-through" }}>{fmt(activeSheet.price)}</span>
              )}
              <span style={{ color: hasSheetOffer ? accent : undefined }}>{fmt(sellPrice(activeSheet))}</span>
            </p>
            <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.62, color: "#8E5A62", textWrap: "pretty" }}>{activeSheet.desc}</p>
            {activeSheet.material !== "" && (
              <div style={{ borderTop: "1px solid #EBD0CC", padding: "16px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: "#A87B81" }}>Composición</span>
                <span style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5B2E36" }}>{activeSheet.material}</span>
              </div>
            )}
            <div style={{ borderTop: "1px solid #EBD0CC", marginTop: 16, padding: "16px 0 0", display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: "#A87B81" }}>Talla</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, animation: nudge ? "edenNudge .5s ease" : "none" }}>
                {activeSheet.sizes.map((t) => {
                  const q = quedan(activeSheet, t);
                  const sel = t === talla;
                  return (
                    <button
                      key={t}
                      className="press"
                      onClick={() => pickTalla(t)}
                      style={{
                        minWidth: 54,
                        height: 46,
                        padding: "0 15px",
                        border: `1px solid ${sel ? accent : q === 0 ? "#EBD0CC" : "#E3C7C4"}`,
                        borderRadius: 14,
                        background: sel ? (q === 0 ? "#EFD9D5" : accent) : "transparent",
                        color: sel ? (q === 0 ? "#A87B81" : "#FDF7F5") : q === 0 ? "#C99AA4" : "#5B2E36",
                        fontSize: 14.5,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        textDecoration: q === 0 ? "line-through" : "none",
                        transition: "transform .4s cubic-bezier(.34,1.5,.64,1),background .35s ease,border-color .35s ease,color .35s ease",
                        ...press({ "--press-scale": "scale(.9)" }),
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: stockColor }}>{stockNota}</span>
            </div>
            {activeSheet.colors.length > 0 && (
              <div style={{ borderTop: "1px solid #EBD0CC", marginTop: 16, padding: "16px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: "#A87B81" }}>Colores disponibles</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  {activeSheet.colors.map((hex, i) => (
                    <span
                      key={i}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: hex, boxShadow: "inset 0 0 0 1px rgba(91,46,54,.16)" }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={{ borderTop: "1px solid #EBD0CC", marginTop: 16, padding: "16px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: "#A87B81" }}>Envío</span>
              <span style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5B2E36" }}>Express en 24–48h, o por Starken y Bluexpress a todo Chile.</span>
            </div>
          </div>
        </div>
        <div
          style={{
            flex: "none",
            padding: "14px 16px 22px",
            borderTop: "1px solid #EBD0CC",
            background: "rgba(253,247,245,.94)",
            backdropFilter: "blur(14px)",
            display: "flex",
            gap: 10,
          }}
        >
          <button
            className="press"
            onClick={closeAll}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              border: "1px solid #E3C7C4",
              background: "transparent",
              color: "#8E5A62",
              fontSize: 17,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "transform .45s cubic-bezier(.32,.72,0,1),background .3s ease",
              ...press({ "--press-scale": "scale(.92)", "--press-bg": "#F3E2DE" }),
            }}
          >
            ✕
          </button>
          <button
            className="press"
            onClick={sheetBtnAction}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 26,
              border: 0,
              background: sheetBtnBg,
              color: "#FDF7F5",
              fontSize: 15.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "transform .45s cubic-bezier(.32,.72,0,1),background .4s ease",
              ...press({ "--press-scale": "scale(.972)" }),
            }}
          >
            {sheetBtnLabel}
          </button>
        </div>
      </div>

      {/* Sheet de carrito */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 80,
          margin: "0 auto",
          maxWidth: 480,
          maxHeight: "82vh",
          background: "#FDF7F5",
          borderRadius: "26px 26px 0 0",
          boxShadow: "0 -18px 60px rgba(91,46,54,.28)",
          transform: `translateY(${cartOpen ? "0%" : "102%"})`,
          transition: "transform .58s cubic-bezier(.32,.72,0,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flex: "none" }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: "#E3C7C4" }} />
        </div>
        <div style={{ flex: "none", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "12px 22px 14px" }}>
          <h3 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 26, fontWeight: 400 }}>Tu carrito</h3>
          <span style={{ fontSize: 13, color: "#A87B81" }}>{count === 1 ? "1 prenda" : `${count} prendas`}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          {cart.length === 0 && (
            <div style={{ padding: "26px 6px 34px", display: "flex", flexDirection: "column", gap: 8 }}>
              <img
                src="/brand/eden-search.png"
                alt=""
                style={{ width: 92, height: 92, objectFit: "contain", filter: "hue-rotate(-24deg) saturate(1.15)", opacity: 0.75, marginBottom: 8 }}
              />
              <span style={{ fontSize: 15, color: "#5B2E36" }}>Todavía no hay nada acá.</span>
              <span style={{ fontSize: 14, color: "#A87B81", lineHeight: 1.6 }}>Vuelve al catálogo y toca el + de la prenda que te gustó.</span>
            </div>
          )}
          {cart.map((c) => {
            const p = productById.get(c.id);
            if (!p) return null;
            const price = sellPrice(p);
            return (
              <div key={`${c.id}-${c.talla}`} style={{ display: "flex", gap: 13, padding: "12px 6px", borderBottom: "1px solid #EBD0CC" }}>
                <img
                  src={p.img}
                  alt={p.name}
                  style={{ width: 64, height: 80, objectFit: "cover", objectPosition: p.imgPos, borderRadius: 10, background: "#EFD9D5", flex: "none" }}
                />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 14.5, lineHeight: 1.25 }}>{p.name}</span>
                  <span style={{ fontSize: 12.5, color: "#A87B81" }}>Talla {c.talla}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, marginTop: "auto" }}>{fmt(price * c.qty)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, alignSelf: "center" }}>
                  <button
                    className="press"
                    onClick={() => step(c.id, c.talla, -1)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      border: "1px solid #E3C7C4",
                      background: "transparent",
                      color: "#5B2E36",
                      fontSize: 15,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "transform .4s cubic-bezier(.32,.72,0,1),background .3s ease",
                      ...press({ "--press-scale": "scale(.86)", "--press-bg": "#F3E2DE" }),
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 18, textAlign: "center", fontSize: 14 }}>{c.qty}</span>
                  <button
                    className="press"
                    onClick={() => step(c.id, c.talla, 1)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      border: "1px solid #E3C7C4",
                      background: "transparent",
                      color: "#5B2E36",
                      fontSize: 15,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "transform .4s cubic-bezier(.32,.72,0,1),background .3s ease",
                      ...press({ "--press-scale": "scale(.86)", "--press-bg": "#F3E2DE" }),
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ flex: "none", padding: "16px 22px 24px", borderTop: "1px solid #EBD0CC", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#8E5A62" }}>Total</span>
            <span style={{ fontSize: 21, fontWeight: 500 }}>{fmt(cartTotal)}</span>
          </div>
          <span style={{ fontSize: 12.5, color: "#A87B81", lineHeight: 1.5 }}>
            Te escribimos al WhatsApp para coordinar el pago por transferencia y el despacho.
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="press"
              onClick={closeAll}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                border: "1px solid #E3C7C4",
                background: "transparent",
                color: "#8E5A62",
                fontSize: 17,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "transform .45s cubic-bezier(.32,.72,0,1),background .3s ease",
                ...press({ "--press-scale": "scale(.92)", "--press-bg": "#F3E2DE" }),
              }}
            >
              ✕
            </button>
            <button
              className="press"
              onClick={() => {
                setOrderError(null);
                setConfirmOpen(true);
              }}
              disabled={cart.length === 0}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 26,
                border: 0,
                background: "#5B2E36",
                color: "#FDF7F5",
                fontSize: 15.5,
                fontWeight: 500,
                cursor: cart.length === 0 ? "default" : "pointer",
                opacity: cart.length === 0 ? 0.7 : 1,
                fontFamily: "inherit",
                transition: "transform .45s cubic-bezier(.32,.72,0,1)",
                ...press({ "--press-scale": "scale(.972)" }),
              }}
            >
              Pedir por WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop de confirmación (por encima del carrito) */}
      <div
        onClick={() => !ordering && setConfirmOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(91,46,54,.46)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          opacity: confirmOpen ? 1 : 0,
          pointerEvents: confirmOpen ? "auto" : "none",
          transition: "opacity .5s cubic-bezier(.32,.72,0,1)",
        }}
      />

      {/* Confirmar pedido */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 90,
          margin: "0 auto",
          maxWidth: 480,
          maxHeight: "85vh",
          background: "#FDF7F5",
          borderRadius: "26px 26px 0 0",
          boxShadow: "0 -18px 60px rgba(91,46,54,.28)",
          transform: `translateY(${confirmOpen ? "0%" : "102%"})`,
          transition: "transform .58s cubic-bezier(.32,.72,0,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flex: "none" }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: "#E3C7C4" }} />
        </div>
        <div style={{ flex: "none", padding: "12px 22px 4px" }}>
          <h3 style={{ margin: "0 0 8px", fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 24, fontWeight: 400 }}>
            Confirmar pedido
          </h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#8E5A62", textWrap: "pretty" }}>
            El sistema va a enviar tu pedido por WhatsApp para que lo procesemos. Ahí mismo, por ese WhatsApp, coordinamos el pago y gestionamos la entrega — no hace falta que hagas nada más acá.
          </p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 22px" }}>
          {cart.map((c) => {
            const p = productById.get(c.id);
            if (!p) return null;
            const price = sellPrice(p);
            return (
              <div
                key={`confirm-${c.id}-${c.talla}`}
                style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid #EBD0CC", fontSize: 13.5, color: "#5B2E36" }}
              >
                <span>
                  {c.qty}× {p.name} <span style={{ color: "#A87B81" }}>(talla {c.talla})</span>
                </span>
                <span style={{ fontWeight: 500, flex: "none" }}>{fmt(price * c.qty)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ flex: "none", padding: "14px 22px 24px", borderTop: "1px solid #EBD0CC", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#8E5A62" }}>Total</span>
            <span style={{ fontSize: 21, fontWeight: 500 }}>{fmt(cartTotal)}</span>
          </div>
          {orderError && <span style={{ fontSize: 12.5, color: accent, lineHeight: 1.5 }}>{orderError}</span>}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="press"
              onClick={() => setConfirmOpen(false)}
              disabled={ordering}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                border: "1px solid #E3C7C4",
                background: "transparent",
                color: "#8E5A62",
                fontSize: 17,
                cursor: ordering ? "default" : "pointer",
                fontFamily: "inherit",
                transition: "transform .45s cubic-bezier(.32,.72,0,1),background .3s ease",
                ...press({ "--press-scale": "scale(.92)", "--press-bg": "#F3E2DE" }),
              }}
            >
              ✕
            </button>
            <button
              className="press"
              onClick={handleWhatsAppOrder}
              disabled={ordering}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 26,
                border: 0,
                background: "#5B2E36",
                color: "#FDF7F5",
                fontSize: 15.5,
                fontWeight: 500,
                cursor: ordering ? "default" : "pointer",
                opacity: ordering ? 0.7 : 1,
                fontFamily: "inherit",
                transition: "transform .45s cubic-bezier(.32,.72,0,1)",
                ...press({ "--press-scale": "scale(.972)" }),
              }}
            >
              {ordering ? "Enviando…" : "Confirmar y enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
