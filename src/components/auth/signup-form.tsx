"use client"

import React, { useState, useEffect } from "react";
import { signup, userAliasTaken } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-auth";

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
            await signup({ name, alias, email, password });

            setSuccess("მომხმარებელი შექმნილია");
            setName("");
            setAlias("");
            setEmail("");
            setPassword("");
            setAliasStatus(null);
        } catch (err) {
            if (err instanceof Error && err.message === 'USER_EXISTS') {
                setError(err.message);
                return;
            }
            if (err instanceof Error && err.message === 'INVALID_INPUT') {
                setError(err.message);
                return;
            }
            setError("Network error — please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogle() {
        const rootUrl = await getGoogleAuthUrl();
        window.location.href = rootUrl;
    }

    useEffect(() => {
        if (!alias) {
            setAliasStatus(null);
            return;
        }

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
                if (!alias || typeof alias !== "string") {
                    await setAliasStatus("invalid");
                    return;
                }

                if (alias.length < 3 || alias.length > 30) {
                    await setAliasStatus("invalid");
                    return;
                }

                if (!/^[a-z0-9_-]+$/i.test(alias)) {
                    await setAliasStatus("invalid");
                    return;
                }
                const taken = await userAliasTaken(alias);
                setAliasStatus(!taken ? "available" : "taken");
            } catch (err) {
                setAliasStatus(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [alias]);

    return (
        <div className="mx-auto w-full max-w-md">
            <div className="overflow-hidden">
                <div className="px-8 py-6">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">შემოგვი1დი</h2>
                    {/* <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Join GSpot — upload photos and let others guess where they were taken.</p> */}

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
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">სახელი</label>
                                <input
                                    className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                                    id="name"
                                    name="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="შენი სრული სახელი (არსად გამოჩნდება)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">მომხმარებელი</label>
                                <div className="relative mt-1">
                                    <input
                                        className="block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                                        id="alias"
                                        name="alias"
                                        value={alias}
                                        onChange={(e) => setAlias(e.target.value.toLowerCase())}
                                        placeholder="უნიკალური სახელი"
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
                            </div>

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
                            {success && <p className="text-sm text-green-600">{success}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
                            >
                                {loading ? "მიმდინარეობს..." : "შექმნა"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}