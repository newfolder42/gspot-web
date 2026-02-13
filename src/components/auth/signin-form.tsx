"use client"

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { APP_NAME } from "@/lib/constants";

export default function SigninForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("მიუთითე მეილი და პაროლი.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("არასწორი მონაცემები ან ქსელის შეცდომა." + result.error);
        return;
      }

      window.location.href = "/";

    } catch {
      setError("დაფიქსირდა გაურკვეველი ხარვეზი.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">დაუბრუნდი {APP_NAME}-ს</h2>
          {/* <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Welcome back — enter your credentials to continue.</p> */}

          <div className="mt-6 grid gap-3">

            <form onSubmit={handleSubmit} className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">მეილი</label>
                <input
                  className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">პაროლი</label>
                <input
                  className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="პაროლი"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
              >
                {loading ? "მიმდინარეობს..." : "ავტორიზაცია"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}