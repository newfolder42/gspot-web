"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function SignupForm() {
    const [name, setName] = useState("");
    const [alias, setAlias] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [aliasStatus, setAliasStatus] = useState<"checking" | "available" | "taken" | "invalid" | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email || !password || !name || !alias) {
            setError("Please fill in all fields.");
            return;
        }

        if (aliasStatus !== "available") {
            setError("Please choose an available alias.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/registration", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, alias, email, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data?.error || `Registration failed (${res.status})`);
            } else {
                setSuccess("Account created - please check your email (if applicable).");
                setName("");
                setAlias("");
                setEmail("");
                setPassword("");
                setAliasStatus(null);
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

    // Debounced alias availability check
    useEffect(() => {
        if (!alias) {
            setAliasStatus(null);
            return;
        }

        // Basic validation
        if (alias.length < 3 || alias.length > 30) {
            setAliasStatus("invalid");
            return;
        }

        if (!/^[a-z0-9_-]+$/i.test(alias)) {
            setAliasStatus("invalid");
            return;
        }

        // Check availability (debounced)
        const timer = setTimeout(async () => {
            setAliasStatus("checking");
            try {
                const res = await fetch("/api/auth/check-alias", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ alias }),
                });
                const data = await res.json();
                setAliasStatus(data.available ? "available" : "taken");
            } catch (err) {
                setAliasStatus(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [alias]);

    return (
        <div className="mx-auto w-full max-w-md">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md ring-1 ring-zinc-100 dark:ring-zinc-800 overflow-hidden">
                <div className="px-8 py-6">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Create your account</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Join GSpot — upload photos and let others guess where they were taken.</p>

                    <div className="mt-6 grid gap-3">
                        {/* <button
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
                                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">Or sign up with email</span>
                            </div>
                        </div> */}

                        <form onSubmit={handleSubmit} className="grid gap-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Name</label>
                                <input
                                    className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                                    id="name"
                                    name="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Username</label>
                                <div className="relative mt-1">
                                    <input
                                        className="block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                                        id="alias"
                                        name="alias"
                                        value={alias}
                                        onChange={(e) => setAlias(e.target.value.toLowerCase())}
                                        placeholder="choose-a-username"
                                    />
                                    {alias && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {aliasStatus === "checking" && (
                                                <div className="inline-block animate-spin h-4 w-4 border-2 border-zinc-400 border-t-zinc-700 rounded-full" />
                                            )}
                                            {aliasStatus === "available" && (
                                                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            {aliasStatus === "taken" && (
                                                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            {aliasStatus === "invalid" && (
                                                <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {aliasStatus === "invalid" && alias && (
                                    <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">Username must be 3-30 chars, letters/numbers/hyphens/underscores only</p>
                                )}
                                {aliasStatus === "taken" && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">This username is already taken</p>
                                )}
                                {aliasStatus === "available" && (
                                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">This username is available!</p>
                                )}
                            </div>

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
                                    placeholder="Create a strong password"
                                />
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}
                            {success && <p className="text-sm text-green-600">{success}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
                            >
                                {loading ? "Creating account..." : "Create account"}
                            </button>
                        </form>

                        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                            Already have an account?{' '}
                            <Link href="/auth/signin" className="font-medium text-[#00c8ff] hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}