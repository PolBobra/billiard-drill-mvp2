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
