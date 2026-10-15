'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Left panel: one card per area, a header and its links.
const CARDS = [
  {
    title: 'ინვენტარი',
    links: [
      { href: '/locations', label: 'ლოკაციები' },
      { href: '/inventory', label: 'მომხმარებლების ინვენტარი' },
      { href: '/items', label: 'ნივთები' },
      { href: '/categories', label: 'კატეგორიები' },
      { href: '/types', label: 'ტიპები' },
    ],
  },
  {
    title: 'რეპორტები',
    links: [{ href: '/reports', label: 'რეპორტები' }],
  },
  {
    title: 'ბოლო აქტივობები',
    links: [{ href: '/activities', label: 'აქტივობები' }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 space-y-3">
      <Link href="/" className="block px-2 py-1 text-base font-bold text-zinc-900 dark:text-zinc-50">
        G&apos;Spot · ადმინი
      </Link>

      {CARDS.map((card) => (
        <section
          key={card.title}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
        >
          <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            {card.title}
          </h2>
          <ul className="p-1 space-y-0.5">
            {card.links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block px-3 py-1.5 rounded-md text-sm ${
                      active
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}
