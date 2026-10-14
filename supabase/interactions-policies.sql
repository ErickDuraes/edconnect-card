-- Rode no SQL Editor do Supabase SOMENTE se NÃO usar SUPABASE_SERVICE_ROLE_KEY.
-- Permite que os endpoints (chave publicável) gravem toques; leitura continua restrita ao dono do cartão.
alter table public.interactions enable row level security;

drop policy if exists "interactions_insert_public" on public.interactions;
create policy "interactions_insert_public" on public.interactions
  for insert to anon, authenticated
  with check (exists (select 1 from public.cards c where c.id = card_id and c.is_active));

drop policy if exists "interactions_select_owner" on public.interactions;
create policy "interactions_select_owner" on public.interactions
  for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id and c.owner_id = auth.uid()));
