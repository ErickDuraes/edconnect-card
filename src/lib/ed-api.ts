// Utilitários que rodam SOMENTE no servidor (endpoints /c/:uid e /api/*).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { destinationOf, canonicalMode, isValidHttpUrl } from "./ed";

const URL_ = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "https://dwrvjectwjbvtukdreka.supabase.co";
const ANON = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_FOionp7Urd5pni9-MFEtSQ_frpDJku-";
// Opcional (recomendado): permite gravar em `interactions` sem abrir a tabela ao público.
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"];

let admin: SupabaseClient | null = null;
export function serverSb(): SupabaseClient {
  if (!admin) admin = createClient(URL_, SERVICE || ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export type Resolved =
  | { ok: true; card: { id: string; uid: string; label: string | null }; mode: string; destination: string }
  | { ok: false; status: 404 | 410 | 422; reason: "not_found" | "paused" | "no_destination" };

export async function resolveCard(uidRaw: string): Promise<Resolved> {
  const uid = decodeURIComponent(uidRaw).trim();
  if (!uid || uid.length > 200) return { ok: false, status: 404, reason: "not_found" };
  const { data: card } = await serverSb().from("cards").select("id, uid, label, active_mode, is_active").eq("uid", uid).maybeSingle();
  if (!card) return { ok: false, status: 404, reason: "not_found" };
  if (!card.is_active) return { ok: false, status: 410, reason: "paused" };
  const mode = canonicalMode(card.active_mode);
  const { data: rec } = await serverSb().from("card_modes").select("mode, is_enabled, config").eq("card_id", card.id).in("mode", Array.from(new Set([mode, card.active_mode]))).eq("is_enabled", true).limit(1).maybeSingle();
  const destination = rec ? destinationOf(mode, (rec.config as Record<string, string>) || {}) : "";
  if (!destination || !isValidHttpUrl(destination)) return { ok: false, status: 422, reason: "no_destination" };
  return { ok: true, card: { id: card.id, uid: card.uid, label: card.label }, mode, destination };
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v); } catch { return v; }
}

function deviceType(ua: string) {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}
function platform(ua: string) {
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Outro";
}
function browser(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Outro";
}

// Registra o toque. NUNCA lança: falha de log não pode impedir o redirecionamento.
const BOT_RE = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|linkedinbot|telegrambot|twitterbot|discordbot|skypeuripreview/i;

export async function logInteraction(request: Request, cardId: string, mode: string, extra: Record<string, unknown> = {}) {
  try {
    const h = request.headers;
    const q = new URL(request.url).searchParams;
    const city = h.get("x-vercel-ip-city");
    const ua = h.get("user-agent") || "";
    const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0]?.trim() || null;
    const row = {
      card_id: cardId,
      mode,
      platform: platform(ua),
      browser: browser(ua),
      language: (h.get("accept-language") || "").split(",")[0] || null,
      country: h.get("x-vercel-ip-country") || null,
      user_agent: ua.slice(0, 500) || null,
      ip_address: ip,
      referer: h.get("referer"),
      device_type: deviceType(ua),
      session_id: null,
      metadata: {
        source: "vercel-endpoint",
        city: city ? safeDecode(city) : null,
        region: h.get("x-vercel-ip-country-region"),
        timezone: h.get("x-vercel-ip-timezone"),
        channel: q.get("s"), // ?s=nfc | ?s=qr no link gravado
        utm_source: q.get("utm_source"),
        utm_medium: q.get("utm_medium"),
        utm_campaign: q.get("utm_campaign"),
        is_bot: BOT_RE.test(ua),
        edge_region: (h.get("x-vercel-id") || "").split("::")[0] || null,
        ...extra,
      },
      occurred_at: new Date().toISOString(),
    };
    const { error } = await serverSb().from("interactions").insert(row);
    if (error) console.warn("[interactions] insert falhou:", error.code, error.message);
  } catch (e) {
    console.warn("[interactions] erro inesperado:", e);
  }
}
