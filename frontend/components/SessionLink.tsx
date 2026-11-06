'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { browserAuth } from '../lib/auth/browser';
import { displayName } from '../lib/auth/display-name';

export function SessionLink() {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({ ready: false, user: null });
  const local = process.env.NEXT_PUBLIC_LOCAL_AUTH === 'true';
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  useEffect(() => {
    if (local || !configured) return;
    const auth = browserAuth().auth;
    let active = true;
    let revision = 0;
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      revision++;
      if (active) setState({ ready: true, user: session?.user ?? null });
    });
    const initialRevision = revision;
    auth.getUser().then(({ data, error }) => {
      if (active && revision === initialRevision) setState({ ready: true, user: error ? null : data.user });
    }).catch(() => {
      if (active && revision === initialRevision) setState({ ready: true, user: null });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [local, configured]);
  if (local) return <Link href="/account">Local demo owner</Link>;
  if (!configured) return <Link href="/login">Sign in</Link>;
  if (!state.ready) return <span role="status">Checking session…</span>;
  if (!state.user) return <Link href="/login">Sign in</Link>;
  return <Link href="/account" className="max-w-64 truncate" title="Open your account">{displayName(state.user.user_metadata) || 'My account'}</Link>;
}
