-- Rode este script no Supabase: SQL Editor > New query > Run
create table if not exists public.inscricoes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  nome        text not null check (char_length(trim(nome)) between 2 and 200),
  apelido     text,
  cpf         text not null check (char_length(cpf) <= 14),
  celular     text not null check (char_length(celular) <= 20),
  graduacao   text,
  dados       jsonb not null default '{}'::jsonb,
  foto        text check (foto is null or char_length(foto) < 400000),
  assinatura  text check (assinatura is null or char_length(assinatura) < 400000)
);

-- Para bases já criadas antes desta versão:
alter table public.inscricoes add column if not exists updated_at timestamptz;

alter table public.inscricoes enable row level security;

-- Evita inscrição duplicada no mesmo CPF (erro 23505 tratado no front-end)
create unique index if not exists inscricoes_cpf_uniq on public.inscricoes (cpf);
create index if not exists inscricoes_created_at_idx on public.inscricoes (created_at desc);
create index if not exists inscricoes_nome_idx on public.inscricoes (nome);

-- Grants explícitos
grant insert on public.inscricoes to anon, authenticated;
grant select, update, delete on public.inscricoes to authenticated;

-- Qualquer visitante pode ENVIAR uma inscrição (mas não consegue ler nem editar)
create policy "visitante envia"  on public.inscricoes for insert to anon, authenticated with check (true);
-- Somente o administrador logado pode LER, EDITAR e EXCLUIR
drop policy if exists "admin le"     on public.inscricoes;
drop policy if exists "admin exclui" on public.inscricoes;
create policy "admin le"     on public.inscricoes for select to authenticated using (true);
create policy "admin edita"  on public.inscricoes for update to authenticated using (true) with check (true);
create policy "admin exclui" on public.inscricoes for delete to authenticated using (true);
