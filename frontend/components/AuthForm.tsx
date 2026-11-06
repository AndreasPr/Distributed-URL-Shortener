"use client";
import { useState } from "react";
import Link from "next/link";
import { browserAuth } from "../lib/auth/browser";
import { safeNext } from "../lib/auth/redirect";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Turnstile } from "./Turnstile";
export type AuthAction =
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password";
const titles = {
  login: "Welcome back",
  signup: "Create your account",
  "forgot-password": "Forgot your password?",
  "reset-password": "Choose a new password",
};
export function AuthForm({
  action,
  nonce,
}: {
  action: AuthAction;
  nonce: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaGeneration, setCaptchaGeneration] = useState(0);
  const [captcha, setCaptcha] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const emailEnabled = process.env.NEXT_PUBLIC_EMAIL_AUTH === "true";
  const needsCaptcha =
    action !== "login" || !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  async function oauth(provider: "github" | "google") {
    setBusy(true);
    setMessage("");
    try {
      const next = safeNext(new URLSearchParams(location.search).get("next"));
      const callback = new URL("/auth/callback", location.origin);
      callback.searchParams.set("next", next);
      const { error } = await browserAuth().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback.toString(),
          // Signing out of Relaymark does not end the browser's Google session.
          ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
        },
      });
      if (error) throw error;
    } catch {
      setMessage(
        "Sign-in could not start. Check that this deployment has authentication configured.",
      );
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (needsCaptcha && !captcha)
        throw new Error("Complete the security check first.");
      const auth = browserAuth().auth;
      const callback = new URL("/auth/callback", location.origin);
      callback.searchParams.set(
        "next",
        action === "forgot-password" ? "/reset-password" : "/dashboard",
      );
      if (action === "login") {
        const { error } = await auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: captcha },
        });
        if (error)
          throw new Error("Unable to sign in. Check your credentials.");
        location.assign(
          safeNext(new URLSearchParams(location.search).get("next")),
        );
      } else if (action === "signup") {
        const { error } = await auth.signUp({
          email,
          password,
          options: {
            captchaToken: captcha,
            emailRedirectTo: callback.toString(),
          },
        });
        if (error)
          throw new Error("Unable to create an account. Please retry.");
        setMessage("Check your email to confirm your account.");
        setCaptcha("");
      } else if (action === "forgot-password") {
        const { error } = await auth.resetPasswordForEmail(email, {
          captchaToken: captcha,
          redirectTo: callback.toString(),
        });
        if (error) throw new Error("Unable to request a reset. Please retry.");
        setMessage("If an account exists, you will receive a reset email.");
        setCaptcha("");
      } else {
        // Recovery session comes only from the PKCE callback. Supabase validates it.
        const { error } = await auth.updateUser({ password });
        if (error) throw new Error("Reset failed. Request a fresh reset link.");
        setMessage("Password updated.");
        setPassword("");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication unavailable.",
      );
    } finally {
      setBusy(false);
      if (needsCaptcha) {
        setCaptcha("");
        setCaptchaGeneration((v) => v + 1);
      }
    }
  }
  return (
    <main className="mx-auto max-w-md space-y-6 p-6 sm:py-16">
      <h1 className="text-3xl font-semibold">{titles[action]}</h1>
      {(action === "login" || action === "signup") && (
        <div className="grid gap-3">
          <Button disabled={busy} onClick={() => oauth("github")}>
            Continue with GitHub
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => oauth("google")}
          >
            Continue with Google
          </Button>
        </div>
      )}
      {emailEnabled ? (
        <form onSubmit={submit} className="space-y-4">
          {action !== "reset-password" && (
            <div>
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          {action !== "forgot-password" && (
            <div>
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                minLength={8}
                required
                autoComplete={
                  action === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {needsCaptcha && (
            <Turnstile
              key={captchaGeneration}
              nonce={nonce}
              onToken={setCaptcha}
            />
          )}
          <Button disabled={busy || (needsCaptcha && !captcha)} type="submit">
            {action === "login"
              ? "Sign in"
              : action === "signup"
                ? "Sign up"
                : action === "forgot-password"
                  ? "Send reset email"
                  : "Update password"}
          </Button>
        </form>
      ) : (
        <p>Email/password authentication is disabled on this deployment.</p>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      <nav
        aria-label="Authentication"
        className="flex flex-wrap gap-4 text-sm underline"
      >
        <Link href="/login">Sign in</Link>
        <Link href="/signup">Sign up</Link>
        {emailEnabled && <Link href="/forgot-password">Forgot password</Link>}
        <Link href="/demo">Explore the demo</Link>
      </nav>
    </main>
  );
}
