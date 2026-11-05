import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | undefined;
export function browserAuth(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Sign-in is not configured on this deployment. Explore the demo instead.",
    );
  // SSR owns cookie storage and PKCE; never supply localStorage as a token store.
  return (client ??= createBrowserClient(url, key));
}
let refresh: Promise<string> | null = null;
export async function accessToken(): Promise<string> {
  const auth = browserAuth().auth;
  const { data, error } = await auth.getSession();
  if (error || !data.session) return "";
  if ((data.session.expires_at ?? 0) * 1000 > Date.now() + 60000)
    return data.session.access_token;
  refresh ??= auth
    .refreshSession()
    .then(({ data, error }) => {
      if (error || !data.session) return "";
      return data.session.access_token;
    })
    .finally(() => {
      refresh = null;
    });
  return refresh;
}
export async function signOut(scope: "local" | "global" = "local") {
  const { error } = await browserAuth().auth.signOut({ scope });
  if (error) throw new Error("Sign out failed. Please retry.");
}
