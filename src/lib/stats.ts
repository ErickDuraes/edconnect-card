// Métricas do painel, calculadas no navegador a partir da tabela `interactions`.
import {
  dayKey, lastDays, tapTime, tapHour, tapSource, tapOutcome, isBotTap, isTestTap, type Tap,
} from "./ed";

export type Row = { key: string; count: number; pct: number };
export type Alert = { level: "warn" | "ok"; title: string; text: string };
export type Completeness = { key: string; filled: number; total: number; pct: number };

export type Stats = {
  total: number;
  sessions: number;
  uniques: number;
  ok: number;
  okPct: number;
  today: number;
  last7: number;
  prev7: number;
  delta: number | null;
  days: { d: string; n: number }[];
  peakDay: { d: string; n: number };
  hours: number[];
  peakHour: number | null;
  heat: number[][];
  heatMax: number;
  source: Row[];
  mode: Row[];
  device: Row[];
  platform: Row[];
  browser: Row[];
  country: Row[];
  outcome: Row[];
  completeness: Completeness[];
  alerts: Alert[];
  recent: Tap[];
  last: Tap | null;
  discarded: number;
};

const TZ = "America/Sao_Paulo";
const wdFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const ms = (t: Tap) => Date.parse(tapTime(t));

function rows(items: string[], limit = 5): Row[] {
  const m = new Map<string, number>();
  for (const k of items) m.set(k, (m.get(k) ?? 0) + 1);
  const all = items.length || 1;
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count, pct: Math.round((count / all) * 100) }));
}

function filled(taps: Tap[], key: string, has: (t: Tap) => boolean): Completeness {
  const n = taps.filter(has).length;
  return { key, filled: n, total: taps.length, pct: taps.length ? Math.round((n / taps.length) * 100) : 0 };
}

export function computeStats(all: Tap[]): Stats {
  // Prévias de link e execuções de teste não são pessoas tocando no cartão.
  const taps = all.filter((t) => !isBotTap(t) && !isTestTap(t));
  const discarded = all.length - taps.length;
  const total = taps.length;

  const withSession = taps.filter((t) => t.session_id);
  const sessions = new Set(withSession.map((t) => t.session_id)).size + (total - withSession.length);
  const uniques = new Set(taps.map((t) => t.ip_address).filter((v): v is string => !!v)).size;
  const ok = taps.filter((t) => tapOutcome(t) === "redirect").length;
  const okPct = total ? Math.round((ok / total) * 1000) / 10 : 0;

  // série diária (30 dias)
  const keys = lastDays(30);
  const byDay: Record<string, number> = {};
  for (const t of taps) { const k = dayKey(tapTime(t)); byDay[k] = (byDay[k] ?? 0) + 1; }
  const days = keys.map((d) => ({ d, n: byDay[d] ?? 0 }));
  const sum = (xs: { n: number }[]) => xs.reduce((a, x) => a + x.n, 0);
  const last7 = sum(days.slice(-7));
  const prev7 = sum(days.slice(-14, -7));
  const delta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;
  const today = days[days.length - 1]?.n ?? 0;
  const peakDay = days.reduce((a, x) => (x.n > a.n ? x : a), days[0] ?? { d: "", n: 0 });

  // horas e mapa de calor (horário de Brasília)
  const hours = new Array<number>(24).fill(0);
  const heat: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const t of taps) {
    const h = tapHour(t);
    if (h < 0 || h > 23) continue;
    hours[h] = (hours[h] ?? 0) + 1;
    const w = WEEKDAY[wdFmt.format(new Date(tapTime(t)))];
    const row = w === undefined ? undefined : heat[w];
    if (row) row[h] = (row[h] ?? 0) + 1;
  }
  const hMax = Math.max(0, ...hours);
  const peakHour = hMax > 0 ? hours.indexOf(hMax) : null;
  const heatMax = Math.max(1, ...heat.map((r) => Math.max(0, ...r)));

  // observabilidade
  const asc = [...taps].sort((a, b) => ms(a) - ms(b));
  let dup = 0;
  for (let i = 1; i < asc.length; i++) {
    const a = asc[i - 1], b = asc[i];
    if (a && b && a.ip_address && a.ip_address === b.ip_address && ms(b) - ms(a) < 2000) dup++;
  }
  const androidTablet = taps.filter((t) => t.platform === "Android" && t.device_type === "tablet" && t.user_agent && !/Mobile/i.test(t.user_agent)).length;
  const completeness = [
    filled(taps, "language", (t) => !!t.language),
    filled(taps, "referer", (t) => !!t.referer),
    filled(taps, "country", (t) => !!t.country),
    filled(taps, "session", (t) => !!t.session_id),
  ];
  const langMissing = total ? 100 - (completeness[0]?.pct ?? 0) : 0;

  const alerts: Alert[] = [];
  if (dup > 0) alerts.push({ level: "warn", title: dup === 1 ? "1 toque duplicado" : `${dup} toques duplicados`, text: "Mesmo IP, com sessões diferentes, em menos de 2 segundos. Costuma ser duplo disparo do NFC. Vale ignorar o segundo registro." });
  if (androidTablet > 0) alerts.push({ level: "warn", title: androidTablet === 1 ? "1 celular aparecendo como tablet" : `${androidTablet} celulares aparecendo como tablet`, text: "O user-agent desses toques não traz a palavra “Mobile”, e a regra de classificação os marca como tablet. Confira a regra de aparelho para o gráfico ficar fiel." });
  if (total > 0 && langMissing >= 50) alerts.push({ level: "warn", title: `Idioma ausente em ${langMissing}% dos toques`, text: "O idioma do navegador não está chegando ao registro. Sem ele não dá para separar visitantes por idioma." });
  if (discarded > 0) alerts.push({ level: "ok", title: discarded === 1 ? "1 registro descartado" : `${discarded} registros descartados`, text: "Prévias de link (WhatsApp, LinkedIn…) e execuções de teste não entram nas métricas." });
  if (!alerts.some((a) => a.level === "warn")) alerts.unshift({ level: "ok", title: "Tudo em ordem", text: "Nenhuma anomalia encontrada nos toques deste período." });

  const desc = [...taps].sort((a, b) => ms(b) - ms(a));
  return {
    total, sessions, uniques, ok, okPct, today, last7, prev7, delta, days, peakDay,
    hours, peakHour, heat, heatMax,
    source: rows(taps.map(tapSource).filter((v): v is string => !!v)),
    mode: rows(taps.map((t) => t.mode).filter((v): v is string => !!v)),
    device: rows(taps.map((t) => t.device_type).filter((v): v is string => !!v)),
    platform: rows(taps.map((t) => t.platform).filter((v): v is string => !!v)),
    browser: rows(taps.map((t) => t.browser).filter((v): v is string => !!v)),
    country: rows(taps.map((t) => t.country).filter((v): v is string => !!v)),
    outcome: rows(taps.map(tapOutcome)),
    completeness, alerts,
    recent: desc.slice(0, 8),
    last: desc[0] ?? null,
    discarded,
  };
}
