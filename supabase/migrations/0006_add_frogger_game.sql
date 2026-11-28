-- SPEC frogger-core (specs/game-jam/frogger/01-frogger-core.md), step 1: add the catalog row 'frogger'.
-- No schema, RLS or grant change.

insert into public.games (id, title, short, long, cat, cover, color)
values (
  'frogger',
  'FROGGER',
  'Cross the road and the river without turning into mush.',
  'Guide your frog across a highway packed with cars and a river of floating logs and turtles. Fill all five bays on the other side to complete the round; each level speeds up traffic and shortens the clock. Three lives and a whole lot of asphalt ahead.',
  'ARCADE',
  'cover-frogger',
  'lime'
);
