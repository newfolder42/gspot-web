import Link from 'next/link';
import React from 'react';
import { getUserIdByAlias } from '@/lib/users';

type Props = {
    children: React.ReactNode;
    params: { userName: string };
};

export default async function UserLayout({ children, params }: Props) {
    const { userName } = await params;
    const targetId = await getUserIdByAlias(userName);

    if (!targetId) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800 flex gap-6">
                    <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">User not found</h1>
                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">We couldn't find the user you're looking for.</p>
                    <p className="mt-4"><Link href="/" className="text-[#00c8ff]">Go home</Link></p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', href: `/account/${userName}` },
        { id: 'connections', label: 'Connections', href: `/account/${userName}/connections` },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800 flex gap-6">
                <aside className="w-48 hidden sm:block">
                    <nav className="flex flex-col space-y-1">
                        {tabs.map((t) => (
                            <Link
                                key={t.id}
                                href={t.href}
                                className="block px-3 py-2 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                                {t.label}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
