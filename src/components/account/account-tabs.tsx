"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AccountTab = {
  id: string;
  label: string;
  href: string;
};

type Props = {
  tabs: AccountTab[];
};

export default function AccountTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className="group inline-flex flex-col items-center px-1 py-3 text-sm font-medium"
            >
              <span
                className={
                  `transition-colors ` +
                  (isActive
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100')
                }
              >
                {tab.label}
              </span>
              <span aria-hidden className={`mt-1 block h-0.5 w-full rounded ${isActive ? 'bg-blue-600' : 'bg-transparent'}`} />
            </Link>
        );
      })}
    </nav>
  );
}
