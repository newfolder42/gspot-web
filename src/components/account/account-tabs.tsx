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
            className="group relative inline-flex items-center px-1 py-3 text-sm font-medium"
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
            <span
              className={
                `absolute left-0 right-0 -bottom-[1px] h-0.5 rounded-full transition-all duration-200 ` +
                (isActive
                  ? 'bg-blue-600'
                  : 'bg-transparent group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600')
              }
            />
          </Link>
        );
      })}
    </nav>
  );
}
