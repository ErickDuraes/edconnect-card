import { createFileRoute } from "@tanstack/react-router";
import { resolveCard } from "@/lib/ed-api";

// GET /api/cards/:uid -> resolve o destino do cartão (sem registrar toque).
export const Route = createFileRoute("/api/cards/$uid")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const r = await resolveCard(params.uid);
        const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
        if (!r.ok) return new Response(JSON.stringify({ ok: false, reason: r.reason }), { status: r.status, headers });
        return new Response(JSON.stringify({ ok: true, uid: r.card.uid, label: r.card.label, mode: r.mode, destination: r.destination }), { headers });
      },
    },
  },
});
