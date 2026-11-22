-- SPEC 07, step 6: add the tetris game row. No schema, RLS or grant changes.

insert into public.games (id, title, short, long, cat, cover, color, plays) values
  ('tetris', 'TETRIS', 'Stack falling blocks and clear rows.',
   'Rotate and drop falling blocks to fill complete rows. Each cleared row scores, and the blocks fall faster every ten lines. The game ends when a new block cannot enter the board.',
   'PUZZLE', 'cover-tetris', 'cyan', 0);
