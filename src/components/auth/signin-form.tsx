"use client"

import React, { useState } from "react";
import { login } from "@/lib/auth";
import { setToken } from "@/lib/session";
import { getGoogleAuthUrl } from "@/lib/google-auth";

export default function SigninForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGoogle() {
        const rootUrl = await getGoogleAuthUrl();
        window.location.href = rootUrl;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError("მიუთითეთ მეილი და პაროლი.");
            return;
        }

        setLoading(true);
        try {
            const user = await login(email, password);
            await setToken(user.id, user.alias, user.sessionId);

            window.location.href = "/";

        } catch (err) {
            setError("დაფიქსირდა გაურკვეველი ხარვეზი.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-md">
            <div className="overflow-hidden">
                <div className="px-8 py-6">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">დაუბრუნდი G'Spot-ს</h2>
                    {/* <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Welcome back — enter your credentials to continue.</p> */}

                    <div className="mt-6 grid gap-3">
                        {/* <button
                            type="button"
                            onClick={handleGoogle}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google-ით შესვლა
                        </button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500 dark:text-zinc-400">ან</span>
                            </div>
                        </div> */}

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