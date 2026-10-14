import { createFileRoute } from "@tanstack/react-router";
import { resolveCard, logInteraction } from "@/lib/ed-api";

// GET /t/:uid -> endpoint de toque (NFC/QR): registra a interação e redireciona (302) ao destino do modo ativo.
export const Route = createFileRoute("/t/$uid")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const r = await resolveCard(params.uid);
        if (!r.ok) {
          // Sem destino: cai na página pública, que mostra a mensagem amigável.
          return new Response(null, { status: 302, headers: { location: `/c/${encodeURIComponent(params.uid)}`, "cache-control": "no-store" } });
        }
        await logInteraction(request, r.card.id, r.mode, { via: "redirect" });
        return new Response(null, { status: 302, headers: { location: r.destination, "cache-control": "no-store" } });
      },
    },
  },
});
