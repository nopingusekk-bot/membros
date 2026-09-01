create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  status text not null default 'active' check (status in ('active','blocked')),
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists progress (
  member_id uuid not null references members(id) on delete cascade,
  lesson integer not null,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(member_id,lesson)
);
create table if not exists notes (
  member_id uuid not null references members(id) on delete cascade,
  lesson integer not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key(member_id,lesson)
);
create table if not exists ratings (
  member_id uuid not null references members(id) on delete cascade,
  lesson integer not null,
  rating integer not null check(rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key(member_id,lesson)
);
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  lesson integer not null,
  text text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists sessions_token_idx on sessions(token_hash);
create index if not exists comments_status_idx on comments(status);
