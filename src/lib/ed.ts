import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Existing Erick Durães Connect database (publishable key — safe in the browser; RLS protects data).
const SUPABASE_URL = "https://dwrvjectwjbvtukdreka.supabase.co";
const SUPABASE_KEY = "sb_publishable_FOionp7Urd5pni9-MFEtSQ_frpDJku-";

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

export type Card = {
  id: string; uid: string; label: string | null; active_mode: string;
  is_active: boolean; owner_id: string; created_at: string; updated_at: string;
};
export type CardMode = {
  id: string; card_id: string; mode: string; is_enabled: boolean;
  config: Record<string, string>; created_at: string; updated_at: string;
};
export type Tap = {
  id?: string; card_id: string; mode?: string; occurred_at?: string; tapped_at?: string;
  country?: string | null; device_type?: string | null; platform?: string | null; browser?: string | null;
  language?: string | null; referer?: string | null; ip_address?: string | null; session_id?: string | null; user_agent?: string | null;
  // Pode chegar como objeto (jsonb) ou como texto JSON (coluna text / workflow n8n).
  metadata?: Record<string, unknown> | string | null;
};

export type ModeInfo = { label: string; description: string; symbol: string; lead: string; ideal: string; help: string };
export const MODE_CONFIG: Record<string, ModeInfo> = {
  perfil: {
    label: "Hub", symbol: "01",
    lead: "Leva ao seu link principal.",
    description: "Redireciona para o link que reúne tudo sobre você ou sua empresa: uma página de links, um perfil, um cartão digital ou qualquer endereço que funcione como seu ponto de partida. É o modo padrão do cartão.",
    ideal: "Networking e primeiro contato, quando você quer que a pessoa chegue ao seu perfil principal.",
    help: "Use o endereço completo, começando com https://. Para mudar o destino depois, é só editar aqui.",
  },
  site: {
    label: "Site", symbol: "02",
    lead: "Leva direto ao seu site.",
    description: "Redireciona na hora para o site da empresa, o portfólio ou qualquer página institucional, sem tela intermediária. É o caminho mais curto entre o toque e o seu conteúdo.",
    ideal: "Quando o site já conta tudo o que a pessoa precisa saber.",
    help: "Use o endereço completo, começando com https://.",
  },
  whatsapp: {
    label: "WhatsApp", symbol: "03",
    lead: "Abre a conversa já com a primeira mensagem.",
    description: "Abre o WhatsApp no seu número, com um texto inicial pronto. A pessoa só precisa tocar em enviar, e você ganha um contato qualificado em segundos.",
    ideal: "Atendimento, orçamento e vendas rápidas.",
    help: "Informe o telefone com código do país e DDD, só números.",
  },
  catalogo: {
    label: "Catálogo", symbol: "04",
    lead: "Mostra seus produtos ou serviços.",
    description: "Leva ao catálogo completo, seja um PDF, uma vitrine online ou uma página de serviços. A pessoa vê o que você oferece antes mesmo de falar com você.",
    ideal: "Lojas, imobiliárias, restaurantes e prestadores de serviço.",
    help: "Pode ser um link de PDF, de loja virtual ou de página de serviços.",
  },
  avaliacao: {
    label: "Avaliação", symbol: "05",
    lead: "Pede uma avaliação no Google.",
    description: "Leva a pessoa direto à tela de avaliação do Google Meu Negócio, ou de outra plataforma como Tripadvisor ou iFood, no momento em que ela está satisfeita. Mais avaliações aumentam sua reputação e sua posição nas buscas.",
    ideal: "Balcão de atendimento, pós-venda, entrega concluída e visita finalizada.",
    help: "No Google, use o link de avaliação do seu perfil da empresa.",
  },
  evento: {
    label: "Evento", symbol: "06",
    lead: "Para quando você está em um evento.",
    description: "Direciona para algo específico do momento: a programação, a inscrição, a sua palestra, o estande ou o material que você apresentou. Troque o destino a cada evento, sem regravar o cartão, e veja quantas pessoas tocaram durante ele.",
    ideal: "Feiras, congressos, convenções e encontros de negócio.",
    help: "Depois do evento, volte para o seu modo de sempre com um toque.",
  },
  lead: {
    label: "Captação de leads", symbol: "07",
    lead: "Pega o contato de quem se interessou.",
    description: "Abre um formulário curto para a pessoa deixar nome e contato. Em vez de só ser encontrado, você sai do encontro com uma lista de interessados para retornar.",
    ideal: "Feiras, palestras e qualquer conversa em que você quer o contato da pessoa.",
    help: "Use o link do seu formulário (Google Forms, Typeform, RD Station e similares).",
  },
  campanha: {
    label: "Campanha", symbol: "08",
    lead: "Destino de uma ação promocional.",
    description: "Leva a uma oferta, lançamento ou promoção com prazo. Cada campanha tem nome próprio, então você mede o resultado dela separado de todo o resto.",
    ideal: "Lançamentos, ofertas por tempo limitado e ações sazonais.",
    help: "O nome interno só aparece para você, nos relatórios.",
  },
};
export const MODES = Object.keys(MODE_CONFIG);
export const canonicalMode = (m: string) => (m === "hub" ? "perfil" : m);
export const modeLabel = (m?: string | null) => {
  const v = String(m || "perfil");
  if (v === "hub") return "Hub";
  if (v === "empreendimento") return "Empreendimento (legado)";
  return MODE_CONFIG[v]?.label || v;
};

type Field = { key: string; label: string; type: string; required?: boolean; placeholder?: string; options?: [string, string][] };
export const MODE_FIELDS: Record<string, Field[]> = {
  perfil: [
    { key: "url", label: "Link do Hub", type: "url", required: true, placeholder: "https://link-do-seu-hub.com.br" },
  ],
  site: [{ key: "url", label: "Endereço do site", type: "url", required: true, placeholder: "https://exemplo.com" }],
  whatsapp: [
    { key: "phone", label: "Telefone com código do país", type: "tel", required: true, placeholder: "5511999999999" },
    { key: "message", label: "Mensagem inicial (opcional)", type: "textarea", placeholder: "Olá! Gostaria de saber mais." },
  ],
  catalogo: [{ key: "url", label: "Endereço do catálogo", type: "url", required: true, placeholder: "https://exemplo.com/catalogo" }],
  avaliacao: [{ key: "url", label: "Link de avaliação", type: "url", required: true, placeholder: "https://g.page/r/seu-codigo/review" }],
  evento: [
    { key: "url", label: "Destino durante o evento", type: "url", required: true },
    { key: "name", label: "Nome do evento", type: "text" },
    { key: "date", label: "Data do evento", type: "date" },
  ],
  lead: [{ key: "url", label: "Endereço do formulário", type: "url", required: true }],
  campanha: [
    { key: "url", label: "Endereço da campanha", type: "url", required: true },
    { key: "name", label: "Nome interno da campanha", type: "text" },
  ],
};

export function isValidHttpUrl(v: string) {
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

export function validateModeConfig(mode: string, config: Record<string, string>):
  { valid: true; config: Record<string, string> } | { valid: false; message: string } {
  if (mode === "perfil") {
    if (!isValidHttpUrl(String(config["url"] || "").trim())) return { valid: false, message: "Informe o link do Hub usando http:// ou https://." };
    const n: Record<string, string> = { ...config, url: String(config["url"]).trim() };
    for (const k of ["website", "linkedin", "instagram", "company_logo_url"]) {
      if (n[k] && !isValidHttpUrl(n[k])) return { valid: false, message: `Informe uma URL http:// ou https:// válida para ${k}.` };
    }
    if (n["email"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n["email"])) return { valid: false, message: "Informe um e-mail válido." };
    if (n["phone"]) {
      n["phone"] = n["phone"].replace(/\D/g, "");
      if (!/^\d{10,15}$/.test(n["phone"])) return { valid: false, message: "Informe o telefone com código do país, entre 10 e 15 dígitos." };
    }
    return { valid: true, config: n };
  }
  if (mode === "whatsapp") {
    const phone = String(config["phone"] || "").replace(/\D/g, "");
    return /^\d{10,15}$/.test(phone)
      ? { valid: true, config: { phone, ...(config["message"] ? { message: config["message"] } : {}) } }
      : { valid: false, message: "Informe um telefone com código do país, entre 10 e 15 dígitos." };
  }
  if (!isValidHttpUrl(String(config["url"] || "").trim())) return { valid: false, message: "Informe uma URL válida iniciada por http:// ou https://." };
  return { valid: true, config: { ...config, url: String(config["url"]).trim() } };
}

export function destinationOf(mode: string, config: Record<string, string> = {}) {
  if (mode === "whatsapp" && config["phone"]) {
    return `https://wa.me/${config["phone"]}${config["message"] ? `?text=${encodeURIComponent(config["message"])}` : ""}`;
  }
  return config["url"] || "";
}

// ---- time helpers (business time zone São Paulo) ----
const TZ = "America/Sao_Paulo";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dtFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const nf = new Intl.NumberFormat("pt-BR");
export const formatNumber = (n: number) => nf.format(n);
const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["pt-BR"], { type: "region" }) : null;
export function countryName(code?: string | null) {
  if (!code) return "Não identificado";
  try { return regionNames?.of(code.toUpperCase()) || code; } catch { return code; }
}
export const deviceLabel = (d?: string | null) => (d === "mobile" ? "Celular" : d === "tablet" ? "Tablet" : d === "desktop" ? "Computador" : "Não identificado");
/** metadata pode vir como objeto ou como texto JSON. */
export function tapMeta(t: Tap): Record<string, unknown> {
  const m = t.metadata;
  if (!m) return {};
  if (typeof m === "string") {
    try { const p: unknown = JSON.parse(m); return p && typeof p === "object" ? (p as Record<string, unknown>) : {}; } catch { return {}; }
  }
  return m;
}
/** Prévias de link (WhatsApp, LinkedIn…) e rastreadores não são pessoas tocando no cartão. */
export const isBotTap = (t: Tap) => tapMeta(t)["is_bot"] === true;
/** Execuções de teste do workflow não contam como toque real. */
export const isTestTap = (t: Tap) => tapMeta(t)["execution_mode"] === "test";
/** Canal do toque: o endpoint da Vercel grava em `channel`; o workflow n8n grava em `source`. */
export function tapSource(t: Tap): string | null {
  const m = tapMeta(t);
  const pick = (v: unknown) => (typeof v === "string" && v && v !== "vercel-endpoint" ? v.toLowerCase() : null);
  return pick(m["channel"]) ?? pick(m["source"]);
}
/** Registros antigos não têm `outcome`: só eram gravados quando o redirecionamento acontecia. */
export function tapOutcome(t: Tap): string {
  const v = tapMeta(t)["outcome"];
  return typeof v === "string" && v ? v : "redirect";
}
const hourFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" });
export const tapHour = (t: Tap) => { const v = tapTime(t); return v ? Number(hourFmt.format(new Date(v))) : -1; };
export const tapTime = (t: Tap) => t.occurred_at ?? t.tapped_at ?? "";
export const dayKey = (d: Date | string) => dayFmt.format(new Date(d));
export const formatDateTime = (v: string) => (v ? dtFmt.format(new Date(v)) : "—");
export function lastDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(Date.now() - i * 86400000)));
  return out;
}

const isMissing = (e: { code?: string; message?: string } | null) =>
  !!e && (["42P01", "PGRST205", "42703", "PGRST204"].includes(e.code || "") || /does not exist|not found|could not find/i.test(e.message || ""));

export async function loadInteractions(sinceIso: string, cardIds: string[]): Promise<Tap[]> {
  const candidates = [["interactions", "occurred_at"], ["interactions", "tapped_at"], ["taps", "tapped_at"]];
  let last: unknown = null;
  for (const [table = "", col = ""] of candidates) {
    const rows: Tap[] = [];
    let offset = 0;
    let failed = false;
    while (true) {
      const { data, error } = await sb().from(table).select("*").gte(col, sinceIso).order(col, { ascending: false }).range(offset, offset + 999);
      if (error) { last = error; if (isMissing(error)) { failed = true; break; } throw error; }
      rows.push(...((data as Tap[]) || []));
      if (!data || data.length < 1000) break;
      offset += data.length;
    }
    if (!failed) return rows.filter((r) => cardIds.includes(r.card_id));
  }
  throw last || new Error("Nenhuma tabela de interações disponível.");
}

export async function loadInteractionTotal(cardIds: string[]) {
  if (!cardIds.length) return 0;
  for (const table of ["interactions", "taps"]) {
    const { count, error } = await sb().from(table).select("*", { count: "exact", head: true }).in("card_id", cardIds);
    if (!error) return count || 0;
    if (!isMissing(error)) throw error;
  }
  return 0;
}
