# Делишки — облачная версия

Эта версия хранит данные в Supabase и автоматически синхронизирует их между устройствами. Локальный localStorage остаётся как кэш и резерв на устройстве.

## 1. Создай бесплатный Supabase-проект
1. Открой https://supabase.com/ и создай проект.
2. В SQL Editor выполни SQL из раздела ниже.
3. Открой Settings → API и скопируй Project URL и Publishable/anon key.
4. Открой `cloud-config.js` и вставь их в `url` и `anonKey`.

## 2. Таблица и защита
В SQL Editor выполни:

```sql
create table if not exists public.delishki_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.delishki_data enable row level security;

drop policy if exists "Users can read own Delishki data" on public.delishki_data;
create policy "Users can read own Delishki data"
on public.delishki_data for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own Delishki data" on public.delishki_data;
create policy "Users can insert own Delishki data"
on public.delishki_data for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own Delishki data" on public.delishki_data;
create policy "Users can update own Delishki data"
on public.delishki_data for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## 3. Публикация
Загрузи содержимое этой папки в GitHub Pages. `index.html` должен лежать в корне репозитория.

## Как работает синхронизация
- При первом входе, если в браузере уже есть локальные данные, они отправляются в облако.
- Если в облаке уже есть данные, приложение загружает их и использует как актуальную версию.
- После каждого изменения данные сохраняются локально и через короткую задержку отправляются в Supabase.
- Ключ Supabase, который находится в `cloud-config.js`, является публичным client/anon key; безопасность обеспечивают RLS-политики. Никогда не вставляй service_role key в приложение.
