-- RLS Policies for checkout-saas
-- Run after schema.sql is deployed

-- merchant_users: authenticated users can read their own row
create policy "Users can read their own merchant_user row"
  on merchant_users for select
  using (auth.email() = email);

-- merchants: authenticated users can read their associated merchant
create policy "Users can read their merchant"
  on merchants for select
  using (
    id in (
      select merchant_id from merchant_users
      where email = auth.email()
    )
  );

-- orders: authenticated users can read orders for their merchant
create policy "Users can read their merchant orders"
  on orders for select
  using (
    merchant_id in (
      select merchant_id from merchant_users
      where email = auth.email()
    )
  );

-- Service role key bypasses RLS entirely (used by API routes)
-- No additional policies needed for server-side operations
