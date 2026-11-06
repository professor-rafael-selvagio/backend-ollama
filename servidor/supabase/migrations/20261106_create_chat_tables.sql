-- ==============================================================================
-- MIGRAÇÃO POSTGRESQL / SUPABASE: USUÁRIOS, PROJETOS, CONVERSAS E MENSAGENS
-- Compatível tanto com PostgreSQL puro (Docker) quanto com Supabase (Nuvem)
-- ==============================================================================

-- 1. Habilita extensão para geração de UUID
create extension if not exists "pgcrypto";

-- 2. Schema de Autenticação e Tabela de Usuários (compatível com Supabase e Postgres puro)
create schema if not exists auth;

create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Função auxiliar auth.uid() para compatibilidade de políticas de RLS
create or replace function auth.uid() returns uuid as $$
begin
    return nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
exception when others then
    return null;
end;
$$ language plpgsql stable;

-- Garante existência da role 'authenticated'
do $$
begin
    if not exists (select from pg_roles where rolname = 'authenticated') then
        create role authenticated;
    end if;
end
$$;

-- 3. Tabela de Projetos (Agrupamento de Chats)
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    color text not null default '#3B82F6',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.projects is 'Projetos criados pelos usuários para agrupar conversas e tópicos de estudo';
comment on column public.projects.user_id is 'ID do usuário proprietário vinculado à tabela auth.users';

-- 4. Tabela de Conversas (Chats)
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    project_id uuid references public.projects(id) on delete set null,
    title text not null default 'Nova Conversa',
    model text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Garante a coluna project_id caso a tabela conversations já exista de execuções anteriores
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' and table_name = 'conversations' and column_name = 'project_id'
    ) then
        alter table public.conversations add column project_id uuid references public.projects(id) on delete set null;
    end if;
end
$$;

comment on table public.conversations is 'Registros de conversas/chats dos usuários com os modelos Ollama';
comment on column public.conversations.user_id is 'ID do usuário proprietário vinculado à tabela auth.users';
comment on column public.conversations.project_id is 'ID opcional do projeto ao qual a conversa pertence';

-- 5. Tabela de Mensagens do Chat
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

-- 6. Índices para Otimização de Performance
create index if not exists idx_users_email on auth.users(email);
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_conversations_project_id on public.conversations(project_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at asc);
create index if not exists idx_messages_user_id on public.messages(user_id);

-- 7. Segurança em Nível de Linha (Row Level Security - RLS)
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Políticas para a tabela 'projects'
drop policy if exists "Usuários podem visualizar seus próprios projetos" on public.projects;
create policy "Usuários podem visualizar seus próprios projetos"
    on public.projects for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem criar seus próprios projetos" on public.projects;
create policy "Usuários podem criar seus próprios projetos"
    on public.projects for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem atualizar seus próprios projetos" on public.projects;
create policy "Usuários podem atualizar seus próprios projetos"
    on public.projects for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem excluir seus próprios projetos" on public.projects;
create policy "Usuários podem excluir seus próprios projetos"
    on public.projects for delete to authenticated
    using ((select auth.uid()) = user_id);

-- Políticas para a tabela 'conversations'
drop policy if exists "Usuários podem visualizar suas próprias conversas" on public.conversations;
create policy "Usuários podem visualizar suas próprias conversas"
    on public.conversations for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem criar suas próprias conversas" on public.conversations;
create policy "Usuários podem criar suas próprias conversas"
    on public.conversations for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem atualizar suas próprias conversas" on public.conversations;
create policy "Usuários podem atualizar suas próprias conversas"
    on public.conversations for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem excluir suas próprias conversas" on public.conversations;
create policy "Usuários podem excluir suas próprias conversas"
    on public.conversations for delete to authenticated
    using ((select auth.uid()) = user_id);

-- Políticas para a tabela 'messages'
drop policy if exists "Usuários podem visualizar mensagens de suas conversas" on public.messages;
create policy "Usuários podem visualizar mensagens de suas conversas"
    on public.messages for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem inserir mensagens em suas conversas" on public.messages;
create policy "Usuários podem inserir mensagens em suas conversas"
    on public.messages for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem excluir mensagens de suas conversas" on public.messages;
create policy "Usuários podem excluir mensagens de suas conversas"
    on public.messages for delete to authenticated
    using ((select auth.uid()) = user_id);

-- 8. Concessão de permissões
grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.conversations to authenticated;
grant select, insert, delete on table public.messages to authenticated;
