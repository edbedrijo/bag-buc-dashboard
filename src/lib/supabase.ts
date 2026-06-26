import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Both clients are created lazily inside functions so env vars are read at
// call time — not at module evaluation — which avoids build-time errors when
// .env.local contains placeholder values.

// Browser client — uses anon key, respects RLS
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server/admin client — uses service role key, bypasses RLS
// Only call this in server-side code (API routes, Server Components)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Fetches all rows from a table by paginating in chunks of `pageSize`.
// Supabase defaults to a 1000-row max per request; this works around it.
export async function fetchAll<T>(
  client: SupabaseClient,
  table: string,
  options: { orderBy?: string; ascending?: boolean } = {}
): Promise<T[]> {
  const PAGE = 1000
  const all: T[] = []
  let from = 0

  while (true) {
    let query = client
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1)

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }

  return all
}
