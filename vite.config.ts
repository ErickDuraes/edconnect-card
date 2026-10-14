import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Build preparado para Vercel (preset "vercel" do Nitro gera .vercel/output).
// Em dev (vite dev) o Nitro não participa do build de produção.
export default defineConfig({
  server: { allowedHosts: true },
  plugins: [
    tsConfigPaths(),
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    tailwindcss(),
    nitro({ preset: "vercel" }),
  ],
  resolve: { dedupe: ["react", "react-dom", "@tanstack/react-router"] },
});
