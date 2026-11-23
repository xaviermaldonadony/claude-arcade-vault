-- SPEC 08, step 5: add the arkanoid game row. No schema, RLS or grant changes.

insert into public.games (id, title, short, long, cat, cover, color, plays) values
  ('arkanoid', 'ARKANOID', 'Break every brick with one ball.',
   'Bounce the ball off the paddle to break every brick. Five levels, three lives, and ten points per brick. Clear all five levels to win.',
   'ARCADE', 'cover-arkanoid', 'magenta', 0);
