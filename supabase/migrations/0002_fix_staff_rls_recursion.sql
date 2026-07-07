-- Fix infinite recursion (42P17) on the staff table.
-- The original staff_owner_write policy evaluated `exists (select 1 from public.staff …)`
-- INSIDE its own USING clause. Reading staff re-evaluated the policy, which read staff
-- again → infinite recursion on every staff select. Move the owner check into a
-- security-definer helper that bypasses RLS (same pattern as auth_shop_id()).

create or replace function auth_is_owner() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.staff where id = auth.uid() and role = 'owner'
  )
$$;

drop policy if exists staff_owner_write on public.staff;
create policy staff_owner_write on public.staff
  for all
  using (shop_id = auth_shop_id() and auth_is_owner())
  with check (shop_id = auth_shop_id() and auth_is_owner());
