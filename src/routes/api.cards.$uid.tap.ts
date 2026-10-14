import { createFileRoute } from "@tanstack/react-router";
import { resolveCard, logInteraction } from "@/lib/ed-api";

// POST /api/cards/:uid/tap -> registra a interação em `interactions` e devolve o destino.
export const Route = createFileRoute("/api/cards/$uid/tap")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
        const r = await resolveCard(params.uid);
        if (!r.ok) return new Response(JSON.stringify({ ok: false, reason: r.reason }), { status: r.status, headers });
        await logInteraction(request, r.card.id, r.mode, { via: "landing" });
        return new Response(JSON.stringify({ ok: true, mode: r.mode, destination: r.destination }), { headers });
      },
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } }),
    },
  },
});
