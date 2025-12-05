"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { formatAge } from "@/lib/formatAge";
import { searchUsersAndPosts } from "@/lib/search";

export default function HeaderSearch() {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<{ users: any[]; posts: any[] } | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!search) {
            setResults(null);
            setShowDropdown(false);
            return;
        }
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await searchUsersAndPosts(search);
                setResults(data);
                setShowDropdown(true);
            } catch {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        }
        if (showDropdown) {
            document.addEventListener("mousedown", handleClick);
        }
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showDropdown]);

    return (
        <div className="relative flex-1">
            <input
                ref={inputRef}
                aria-label="Search"
                placeholder="მოძებნა ფოტო-სურათი, მომხმარებელი..."
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#00c8ff]"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => { if (results) setShowDropdown(true); }}
            />
            <button className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-zinc-600 dark:text-zinc-300">ძებნა</button>
            {showDropdown && (
                <div ref={dropdownRef} className="absolute left-0 mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    {loading && (
                        <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">ძებნა...</div>
                    )}
                    {!loading && results && (
                        <>
                            {results.users.length > 0 && (
                                <div>
                                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">თიკუნი</div>
                                    {results.users.slice(0, 5).map((u: any) => (
                                        <Link key={u.id} href={`/account/${u.alias}`} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                                            <span className="font-mono text-sm text-blue-600 dark:text-blue-400">@{u.alias}</span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">ასაკი: {formatAge(u.age)}</span>
                                        </Link>
                                    ))}
                                    {results.users.length > 5 && (
                                        <div className="px-4 py-2 text-center">
                                            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">მეტის ნახვა</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {results.posts.length > 0 && (
                                <div>
                                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">ფოტო-სურათები</div>
                                    {results.posts.slice(0, 5).map((p: any) => (
                                        <Link key={p.id} href={`/post/${p.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                                            <span className="font-mono text-xs text-zinc-700 dark:text-zinc-200">{p.title}</span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">ავტორი: @{p.author}</span>
                                        </Link>
                                    ))}
                                    {results.posts.length > 5 && (
                                        <div className="px-4 py-2 text-center">
                                            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">მეტის ნახვა</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {results.users.length === 0 && results.posts.length === 0 && (
                                <div className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">ვერაფერი მოიძებნა</div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
