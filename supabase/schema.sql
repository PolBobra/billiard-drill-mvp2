-- ============================================
-- БИЛЬЯРДНЫЙ ТРЕНАЖЁР — СХЕМА БАЗЫ ДАННЫХ
-- Вставь этот файл целиком в Supabase -> SQL Editor -> Run
-- ============================================

-- Профиль игрока (расширяет встроенную таблицу auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  level text default 'beginner',
  accuracy int default 50,
  power_control int default 50,
  cue_ball_control int default 50,
  positioning int default 50,
  stability int default 50,
  created_at timestamptz default now()
);

-- База упражнений (сердце системы)
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  error_type text not null,       -- промах, недокрут, перекрут, слабый_удар, сильный_удар, плохой_выход, ошибка_позиции
  angle_min int default 0,
  angle_max int default 90,
  distance text not null,          -- close / medium / far
  situation_type text,             -- angled_shot, straight_shot, bank_shot и т.д.
  description text,
  reps int default 10,
  success_criteria text,
  difficulty numeric default 0.5,
  created_at timestamptz default now()
);

-- Журнал зафиксированных ситуаций/ошибок и какое упражнение было выдано
create table if not exists shot_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  error_type text not null,
  angle int,
  distance text,
  matched_exercise_id uuid references exercises(id),
  completed boolean default false,
  diagram jsonb,                   -- сохранённый рисунок удара (стол, шары, траектории)
  created_at timestamptz default now()
);

-- ============================================
-- RLS (Row Level Security) — каждый видит только своё
-- ============================================
alter table profiles enable row level security;
alter table shot_logs enable row level security;
alter table exercises enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can view own logs" on shot_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on shot_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own logs" on shot_logs
  for update using (auth.uid() = user_id);

-- Упражнения видны всем залогиненным пользователям
create policy "Anyone logged in can view exercises" on exercises
  for select using (auth.role() = 'authenticated');

-- ============================================
-- Автосоздание профиля при регистрации
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Несколько примеров упражнений для теста
-- ============================================
insert into exercises (name, error_type, angle_min, angle_max, distance, situation_type, description, reps, success_criteria, difficulty)
values
('Контроль борта 30–45°', 'ошибка_позиции', 30, 45, 'medium', 'angled_shot', '15 одинаковых ударов под углом с отскоком от борта', 15, '10/15 попаданий в целевую зону', 0.6),
('Прямой удар на дальней дистанции', 'слабый_удар', 0, 10, 'far', 'straight_shot', 'Удар битком по прямой на дальнюю лузу с ровной силой', 20, '15/20 точных попаданий', 0.5),
('Резаный удар под острым углом', 'недокрут', 45, 70, 'close', 'angled_shot', 'Серия резаных ударов с контролем угла среза', 15, '12/15 попаданий', 0.7),
('Контроль выхода битка', 'плохой_выход', 0, 30, 'medium', 'position_play', 'После удара биток должен остановиться в заданной зоне', 12, '9/12 успешных выходов', 0.65);

-- ============================================
-- Профиль игрока: ФИО, фото, клуб, тренер, кий
-- ============================================
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists club text;
alter table profiles add column if not exists coach text;
alter table profiles add column if not exists cue text;

-- Бакет для фото профиля
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users can upload own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Users can update own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- Согласие с пользовательским соглашением при регистрации
-- ============================================
alter table profiles add column if not exists terms_accepted_at timestamptz;

-- ============================================
-- Модерация: права администратора и пометка подозрительных аккаунтов
-- ============================================
alter table profiles add column if not exists is_admin boolean default false;
alter table profiles add column if not exists flagged_suspicious boolean default false;
-- Себе вручную проставить is_admin = true через Table Editor после выполнения этого блока.

-- ============================================
-- Клубы: справочник с поиском в профиле + заявки на добавление
-- ============================================
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz default now(),
  unique (name, city)
);
alter table clubs enable row level security;
create policy "Anyone logged in can view clubs" on clubs
  for select using (auth.role() = 'authenticated');

create table if not exists addition_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  city text,
  status text not null default 'pending', -- pending / approved / rejected
  created_at timestamptz default now()
);
alter table addition_requests enable row level security;
create policy "Users can insert own club requests" on addition_requests
  for insert with check (auth.uid() = user_id);
create policy "Users can view own club requests" on addition_requests
  for select using (auth.uid() = user_id);
-- список pending-заявок и одобрение/отклонение идёт через /api/admin/club-requests
-- (сервисный ключ, тот же паттерн, что и у остальной админки), поэтому отдельная
-- RLS-политика "админ видит все заявки" не нужна.

-- profiles.club (текст) заменяется ссылкой на справочник клубов; старую
-- текстовую колонку не трогаем (не дропаем), просто больше не используем.
alter table profiles add column if not exists club_id uuid references clubs(id);

-- ============================================
-- Починка: PostgREST не видел связь profiles -> clubs
-- ("Could not find a relationship between 'profiles' and 'clubs'").
-- Если club_id был добавлен колонкой, которая уже существовала БЕЗ FK
-- (например, из-за повторного запуска ALTER ... ADD COLUMN IF NOT EXISTS —
-- в этом случае весь ADD COLUMN, включая REFERENCES, тихо пропускается),
-- то сам constraint мог не создаться. Этот блок безопасно доставляет его,
-- если он ещё не существует, и просит PostgREST перечитать схему.
-- ============================================
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'profiles' and constraint_name = 'profiles_club_id_fkey'
  ) then
    alter table profiles add constraint profiles_club_id_fkey foreign key (club_id) references clubs(id);
  end if;
end $$;

notify pgrst, 'reload schema';

-- ============================================
-- Тип заявки (клуб / тренер) — одна таблица addition_requests на оба случая.
-- Старые заявки (клубы) по умолчанию получают type='club'.
-- ============================================
alter table addition_requests add column if not exists type text not null default 'club';

-- ============================================
-- Тренеры: справочник с поиском в профиле (по аналогии с clubs)
-- ============================================
create table if not exists coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);
alter table coaches enable row level security;
create policy "Anyone authenticated can view coaches" on coaches
  for select using (auth.role() = 'authenticated');
create extension if not exists pg_trgm;
create index if not exists coaches_name_search on coaches using gin (name gin_trgm_ops);

alter table profiles add column if not exists coach_id uuid references coaches(id);

-- та же защита от "молчаливо пропущенного" FK, что и для club_id выше
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'profiles' and constraint_name = 'profiles_coach_id_fkey'
  ) then
    alter table profiles add constraint profiles_coach_id_fkey foreign key (coach_id) references coaches(id);
  end if;
end $$;

notify pgrst, 'reload schema';

-- ============================================
-- Матчи: счётчик счёта для реальной игры + история
-- ============================================
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  player1_name text not null,
  player2_name text not null,
  score1 int not null default 0,
  score2 int not null default 0,
  duration_seconds int not null default 0,
  winner text not null, -- player1 / player2 / draw
  created_at timestamptz default now()
);
alter table matches enable row level security;
create policy "Users can view own matches" on matches
  for select using (auth.uid() = user_id);
create policy "Users can insert own matches" on matches
  for insert with check (auth.uid() = user_id);
