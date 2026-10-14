import { useState } from "react";

// Logo com fundo transparente em public/ed-logo.png (2244 × 1296, recortada rente à arte, 4x o original).
// Não depende de mistura de cores: funciona sobre qualquer fundo, claro ou escuro.
// Se o arquivo não existir, mostra um wordmark em texto (não quebra a página).
export function EdLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`font-display tracking-wide inline-block ${className}`} role="img" aria-label="Erick Durães Connect" translate="no">
        Erick Durães Connect
      </span>
    );
  }
  return (
    <span className={`inline-block aspect-[2244/1296] ${className}`}>
      <img
        src="/ed-logo.png"
        alt="Erick Durães Connect"
        width={2244}
        height={1296}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onError={() => setFailed(true)}
        translate="no"
        draggable={false}
        className="ed-logo block h-full w-full select-none object-contain"
      />
    </span>
  );
}
