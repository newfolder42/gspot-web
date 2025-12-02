import Link from 'next/link';
import React from 'react';
import { getUserIdByAlias } from '@/lib/users';

type Props = {
    children: React.ReactNode;
    params: Promise<{ userName: string }>;
};

export default async function UserLayout({ children, params }: Props) {
    const { userName } = await params;
    const targetId = await getUserIdByAlias(userName);

    if (!targetId) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800 flex gap-6">
                    <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">მომხმარებელი არ მოიძებნა</h1>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'ძირითადი', href: `/account/${userName}` },
        { id: 'connections', label: 'კავშირები', href: `/account/${userName}/connections` },
    ];

    function TabsNav() {
        return (
            <nav className="flex flex-col space-y-1">
                {tabs.map((t) => {
                    const selected = false;
                    return (
                        <Link
                            key={t.id}
                            href={t.href}
                            className={
                                `block px-3 py-2 rounded-md text-sm ` +
                                (selected
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800')
                            }
                        >
                            {t.label}
                        </Link>
                    );
                })}
            </nav>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800 flex gap-6">
                <aside className="w-48 hidden sm:block">
                    <TabsNav />
                </aside>

                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
