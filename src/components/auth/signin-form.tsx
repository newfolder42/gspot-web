"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function SigninForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError("Please enter email and password.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data?.error || `Sign in failed (${res.status})`);
            } else {
                window.location.href = "/";
            }
        } catch (err) {
            setError("Network error — please try again.");
        } finally {
            setLoading(false);
        }
    }

    function handleGoogle() {
        alert("Google sign-in is not implemented yet.");
    }

    return (
        <div className="mx-auto w-full max-w-md">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md ring-1 ring-zinc-100 dark:ring-zinc-800 overflow-hidden">
                <div className="px-8 py-6">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sign in to GSpot</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Welcome back — enter your credentials to continue.</p>

                    <div className="mt-6 grid gap-3">
                        <button
                            type="button"
                            onClick={handleGoogle}
                            className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                        >
                            Continue with Google
                        </button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center" aria-hidden>
                                <div className="w-full border-t border-zinc-100 dark:border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">Or sign in with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="grid gap-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Email</label>
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
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Password</label>
                                <input
                                    className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Your password"
                                />
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
                            >
                                {loading ? "Signing in..." : "Sign in"}
                            </button>
                        </form>

                        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                            Don't have an account?{' '}
                            <Link href="/auth/signup" className="font-medium text-[#00c8ff] hover:underline">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}