-- SPEC 06, step 3 fix: 0001 created the tables and RLS policies but no table grants.
-- Without these, the publishable key gets "permission denied" before RLS is checked.
-- RLS still decides the rows: games is read-only, and scores takes inserts only.

grant select on public.games to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;

-- scores.id is an identity column, so an insert needs its sequence.
grant usage on all sequences in schema public to anon, authenticated;
