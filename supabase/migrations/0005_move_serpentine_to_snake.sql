-- SPEC 09, step 1: the catalog row 'serpentine' becomes 'snake', title SNAKE.
-- scores.game_id references games.id, so the row is copied, the scores are moved, then the old row is deleted.
-- No schema, RLS or grant change. The insert trigger on scores does not run on the update below.

insert into public.games (id, title, short, long, cat, cover, color, plays)
select 'snake', 'SNAKE',
  'Eat fruit, grow longer, and do not bite your own tail.',
  'Steer the snake through the grid to eat fruit. Every bite makes it longer and faster, and the walls wrap around. One life: bite your own tail and the run ends.',
  cat, cover, color, plays
from public.games
where id = 'serpentine';

update public.scores set game_id = 'snake' where game_id = 'serpentine';

delete from public.games where id = 'serpentine';
