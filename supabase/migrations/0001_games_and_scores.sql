-- SPEC 06, step 1: game catalog and scores.

create table public.games (
  id text primary key,            -- URL slug, e.g. 'block-buster'
  title text not null,            -- uppercase display name
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover text not null,            -- CSS class name, e.g. 'cover-bricks'
  color text not null check (color in ('cyan','magenta','yellow','green')),
  plays integer not null default 0 check (plays >= 0)
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id),
  name text not null check (char_length(name) between 1 and 10),
  score integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

-- Anonymous and signed-in callers may only read games. Writes to games happen through the trigger below.
alter table public.games enable row level security;
alter table public.scores enable row level security;

revoke insert, update, delete on public.games from anon, authenticated;
revoke update, delete on public.scores from anon, authenticated;

create policy "games_select_public" on public.games
  for select to anon, authenticated using (true);

create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_public" on public.scores
  for insert to anon, authenticated with check (true);

-- SECURITY DEFINER: the caller is anon, who has no update policy on games.
-- The function runs as its owner, so the counter update is not blocked by RLS.
create or replace function public.bump_game_plays()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.games set plays = plays + 1 where id = new.game_id;
  return new;
end;
$$;

create trigger scores_bump_game_plays
  after insert on public.scores
  for each row execute function public.bump_game_plays();

insert into public.games (id, title, short, long, cat, cover, color, plays) values
  ('block-buster', 'BLOCK BUSTER', 'Bounce the ball and smash neon walls.',
   'Pilot a paddle ship and bounce a plasma core to pulverize walls of chromatic blocks. Each level rearranges the grid into impossible patterns. How far can your streak go?',
   'ARCADE', 'cover-bricks', 'cyan', 0),
  ('fall', 'FALL', 'Fit the pieces before the ceiling crushes you.',
   'Geometric pieces descend from the darkness. Rotate them, slot them in, and clear lines to survive. The speed ramps up mercilessly every 10 lines.',
   'PUZZLE', 'cover-tetro', 'magenta', 0),
  ('serpentine', 'SERPENTINE', 'Grow without biting your own tail.',
   'A snake of light roams the grid hunting magenta cores. Every bite makes it longer and faster. One wrong move and it devours itself.',
   'ARCADE', 'cover-snake', 'green', 0),
  ('glutton', 'GLUTTON', 'Devour points and escape the ghosts.',
   'A hungry circle patrols a maze collecting glowing dots. Four specters chase it, but every so often a pill appears that reverses the roles.',
   'ARCADE', 'cover-glutton', 'yellow', 0),
  ('invaders', 'INVADERS', 'Defend the planet from alien rows.',
   'Waves of hostile pixels descend formation after formation. Move your cannon horizontally and open fire with precision before they reach the surface.',
   'SHOOTER', 'cover-invaders', 'green', 0),
  ('asteroids', 'ASTEROIDS', 'Pulverize asteroids in zero gravity.',
   'Your triangular ship drifts through absolute vacuum. Shoot and rotate to split rocks into ever-smaller fragments. Watch out for UFOs on the horizon.',
   'SHOOTER', 'cover-rocks', 'yellow', 0),
  ('frogrun', 'FROGRUN', 'Cross the pixel highway.',
   'Hop between lanes of speeding cars and drifting logs on the river. Reach the lily pads before time runs out.',
   'ARCADE', 'cover-frog', 'green', 0),
  ('pixel-duel', 'PIXEL DUEL', 'Two paddles. One ball. Maximum reflexes.',
   'The purest duel: two vertical paddles face off to bounce a glowing ball. Solo mode against the CPU or local two-player matches.',
   'VERSUS', 'cover-duel', 'cyan', 0);
