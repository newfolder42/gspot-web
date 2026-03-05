"use client"

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SigninForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setSuccess("პაროლი წარმატებით შეიცვალა! ახლა შეგიძლია შეხვიდე ახალი პაროლით.");
    }
  }, [searchParams]);

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

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">მეილი</label>
                <input
                  className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">პაროლი</label>
                  <Link href="/auth/restore-password" className="text-xs text-[#00c8ff] hover:text-[#00b0e6] transition-colors">
                    დაგავიწყდა პაროლი?
                  </Link>
                </div>
                <div className="relative mt-1">
                  <input
                    className="block w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="პაროლი"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    aria-label={showPassword ? "დამალე პაროლი" : "აჩვენე პაროლი"}
                  >
                    {showPassword ? "დამალე" : "ნახვა"}
                  </button>
                </div>
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