-- ==============================================================================
-- MIGRAÇÃO POSTGRESQL / SUPABASE: TABELAS DE CONVERSAS E MENSAGENS DO OLLAMA
-- ==============================================================================

-- 1. Habilita extensão para geração de UUID caso não esteja ativa
create extension if not exists "pgcrypto";

-- 2. Tabela de Conversas (Chats)
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Nova Conversa',
    model text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.conversations is 'Registros de conversas/chats dos usuários com os modelos Ollama';
comment on column public.conversations.user_id is 'ID do usuário proprietário vinculado ao Supabase Auth';

-- 3. Tabela de Mensagens do Chat
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('system', 'user', 'assistant')),
    content text not null,
    tokens integer,
    created_at timestamptz not null default now()
);

comment on table public.messages is 'Mensagens individuais enviadas pelo usuário e geradas pelo Ollama';

-- 4. Índices para Otimização de Performance
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at asc);
create index if not exists idx_messages_user_id on public.messages(user_id);

-- 5. Segurança em Nível de Linha (Row Level Security - RLS)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Políticas para a tabela 'conversations' (Usuário acessa somente suas próprias conversas)
create policy "Usuários podem visualizar suas próprias conversas"
    on public.conversations
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Usuários podem criar suas próprias conversas"
    on public.conversations
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Usuários podem atualizar suas próprias conversas"
    on public.conversations
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Usuários podem excluir suas próprias conversas"
    on public.conversations
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- Políticas para a tabela 'messages' (Usuário acessa somente suas próprias mensagens)
create policy "Usuários podem visualizar mensagens de suas conversas"
    on public.messages
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Usuários podem inserir mensagens em suas conversas"
    on public.messages
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Usuários podem excluir mensagens de suas conversas"
    on public.messages
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- 6. Concessão de permissões às roles de API do Supabase
grant select, insert, update, delete on table public.conversations to authenticated;
grant select, insert, delete on table public.messages to authenticated;

