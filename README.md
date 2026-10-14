# Erick Durães Connect — Card Buddy

Painel + endpoints de toque do cartão Erick Durães Connect (TanStack Start + Supabase), pronto para a **Vercel**.

## Endpoints

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/t/:uid` | **Toque (NFC/QR)**: grava em `interactions` e redireciona (302) ao destino do modo ativo. Grave no cartão `/t/UID?s=nfc` e use `?s=qr` no QR code; `utm_*` também são registrados |
| GET | `/c/:uid` | Página pública do cartão (continua funcionando; registra o toque via `/api/.../tap`) |
| GET | `/api/cards/:uid` | JSON com modo e destino (não registra toque) |
| POST | `/api/cards/:uid/tap` | Registra o toque e devolve o destino |
| GET | `/api/health` | Verificação de saúde |
| GET | `/` e `/dashboard` | Login e painel (Supabase Auth, direto do navegador) |

## Deploy na Vercel

1. Coloque o logo em `public/ed-logo.png`, PNG com fundo transparente (sem ele aparece um texto "Erick Durães Connect").
2. Faça o upload/arraste a pasta em vercel.com/new (framework: detectado automaticamente) **ou** `npx vercel --prod`.
3. (Recomendado) Em *Settings → Environment Variables*, adicione `SUPABASE_SERVICE_ROLE_KEY` (veja `.env.example`) e faça redeploy.
   Sem ela, rode `supabase/interactions-policies.sql` no SQL Editor.
4. Supabase → Authentication → URL Configuration: adicione a URL da Vercel em *Site URL / Redirect URLs*.
5. Teste: `https://SEU-APP.vercel.app/api/health`.

## Dev local

```sh
npm install --legacy-peer-deps
npm run dev
```

## Dados registrados em cada toque

`interactions` recebe plataforma, navegador, dispositivo, idioma, país, IP, referer e, em `metadata`:
cidade, região, fuso, origem (`channel`: nfc/qr), `utm_*`, `is_bot` (prévias de link do WhatsApp, LinkedIn etc.) e região do edge.
O painel ignora toques com `is_bot = true` e mostra quantos foram descartados. Toques antigos não têm esses campos e continuam contando.
IP e cidade podem ser dados pessoais (LGPD): informe isso na política de privacidade ou remova `ip_address` em `src/lib/ed-api.ts`.

## Design

Tokens e tipografia em `src/styles.css`: fundo preto puro (o mesmo da logo e do cartão), branco e prata, **Bodoni Moda** nos títulos, DM Serif Display no nome do cartão e Manrope no texto. Botões e campos em pílula com contorno, foco visível e `prefers-reduced-motion` respeitado.

- **Logo:** `public/ed-logo.png` é o logo com fundo transparente, recortado rente à arte e em alta resolução (2244 × 1296). O componente `EdLogo` o exibe sem recorte nem mistura de cores; no tema claro as cores são invertidas por CSS.
- **Cartão:** `public/card-blank.png` é a arte original do cartão **sem o nome**. O componente `PhysicalCard` escreve o nome do titular por cima, na posição em que a gráfica imprime. Para mudar a posição ou o tamanho do nome, edite as classes do `<span>` em `src/components/PhysicalCard.tsx`.

## Painel

| Seção | O que mostra |
| --- | --- |
| Destino atual | Cartão, modo ativo, destino, último toque e toques de hoje |
| 01 · Modos | Os 8 modos com descrição, "ideal para" e configuração. Textos em `MODE_CONFIG` (`src/lib/ed.ts`) |
| 02 · Visão geral | Toques, sessões, visitantes únicos, taxa de sucesso, toques por dia, por hora e mapa de calor |
| 03 · Audiência | Canal, modo, aparelho, sistema, navegador e país |
| 04 · Observabilidade | Alertas (toque duplicado, aparelho mal classificado, dados vazios), resultado dos toques e completude dos dados |
| 05 · Registro | Últimos 8 toques |

As contas ficam em `src/lib/stats.ts` (com teste em `src/lib/stats.test.ts`). O Hub é apenas um link: não existe página própria com vários links.

## Dados dos toques

O painel lê `interactions` e aceita os dois formatos de gravação:

- **Endpoint da Vercel** (`/t/:uid`): canal em `metadata.channel`.
- **Workflow n8n**: canal em `metadata.source`, mais `outcome`, `session_id` e `execution_mode`.

`metadata` pode ser `jsonb` ou texto JSON; as duas formas funcionam. Toques com `is_bot = true` ou `execution_mode = "test"` ficam fora das métricas e aparecem em "registros descartados".
