import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeStats } from "@/lib/stats";
import type { Tap } from "@/lib/ed";

// Toques reais do workflow n8n: metadata chega como texto JSON e o canal vem em `source`.
const meta = (execution: string) =>
  JSON.stringify({ source: "nfc", outcome: "redirect", raw_mode: "whatsapp", new_session: true, execution_mode: "production", execution_id: execution });
const base = {
  card_id: "c1", mode: "whatsapp", platform: "Android", browser: "Samsung Internet", language: null, country: "BR", referer: null,
  device_type: "tablet", ip_address: "2804:14c:65b6:40b8:9681:243f:d3db:15e6",
  user_agent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.0 Chrome/143.0.0.0 Safari/537.36",
} satisfies Partial<Tap>;
const taps: Tap[] = [
  { ...base, id: "a", occurred_at: "2026-10-13T21:39:06.521+00:00", session_id: "f6aaa993", metadata: meta("83") },
  { ...base, id: "b", occurred_at: "2026-10-13T21:39:06.249+00:00", session_id: "e3ac82e4", metadata: meta("84") },
  { ...base, id: "c", occurred_at: "2026-10-13T21:08:50.154+00:00", session_id: "55a8993d", metadata: meta("81") },
];

describe("computeStats", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-13T22:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("conta toques, sessões e visitantes únicos", () => {
    const s = computeStats(taps);
    expect(s.total).toBe(3);
    expect(s.sessions).toBe(3);
    expect(s.uniques).toBe(1);
    expect(s.today).toBe(3);
    expect(s.okPct).toBe(100);
    expect(s.source[0]?.key).toBe("nfc");
  });

  it("aponta toque duplicado, celular como tablet e idioma ausente", () => {
    const titles = computeStats(taps).alerts.map((a) => a.title);
    expect(titles).toContain("1 toque duplicado");
    expect(titles).toContain("3 celulares aparecendo como tablet");
    expect(titles).toContain("Idioma ausente em 100% dos toques");
  });

  it("descarta prévias de link e execuções de teste", () => {
    const bot: Tap = { ...taps[0]!, id: "x", metadata: { is_bot: true } };
    const test: Tap = { ...taps[0]!, id: "y", metadata: { execution_mode: "test" } };
    const s = computeStats([...taps, bot, test]);
    expect(s.total).toBe(3);
    expect(s.discarded).toBe(2);
  });
});
