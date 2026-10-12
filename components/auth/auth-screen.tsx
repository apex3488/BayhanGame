"use client";

import { FormEvent, useState } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-provider";
import { MiniappApiError } from "@/lib/api/miniapp-client";

export function AuthScreen() {
  const { login, register, status } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(loginName, password);
      else await register(loginName, password, displayName || undefined);
    } catch (err) {
      setError(err instanceof MiniappApiError ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unconfigured") {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <Card className="max-w-md p-6 text-center">
          <p className="text-lg font-semibold text-white">API не настроен</p>
          <p className="mt-2 text-sm text-mist-300">
            Укажите <code className="text-brand-200">NEXT_PUBLIC_GAME_API_URL</code> на независимый backend Mini App.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative grid min-h-[85vh] place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(15,23,42,0.9),transparent_45%)]" />
      <Card className="relative w-full max-w-md border-white/10 bg-ink-950/80 p-6 backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <p className="text-sm text-mist-300">Собственный аккаунт · старт $50,000 · независимая экономика</p>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-semibold ${mode === "login" ? "bg-brand-500 text-white" : "text-mist-300"}`}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-semibold ${mode === "register" ? "bg-brand-500 text-white" : "text-mist-300"}`}
            onClick={() => setMode("register")}
          >
            Регистрация
          </button>
        </div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block text-mist-300">Логин</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-brand-400"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
            />
          </label>
          {mode === "register" && (
            <label className="block text-sm">
              <span className="mb-1 block text-mist-300">Отображаемое имя</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-brand-400"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={64}
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-mist-300">Пароль</span>
            <input
              type="password"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-brand-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" block loading={busy}>
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
