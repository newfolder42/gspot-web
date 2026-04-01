import Link from "next/link";
import { HomeIcon, LeaderboardIcon, NewUsersIcon } from "@/components/icons";
import { ZoneBaseType } from "@/types/zone";

type MobileNavProps = {
  zones?: ZoneBaseType[] | null;
};

export default function LeftPanel({ zones }: MobileNavProps) {
  return (
    <aside className="hidden md:block px-4 py-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 md:fixed md:left-0 md:top-14 md:h-[calc(100vh-56px)] md:w-56 md:rounded-none md:shadow-sm z-layer-sidebar">
      <nav>
        <ul className="space-y-1">
          <li>
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <HomeIcon className="w-5 h-5" />
              <span>მთავარი</span>
            </Link>
          </li>

          <li>
            <Link
              href="/new-users"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <NewUsersIcon className="w-5 h-5" />
              <span>მომხმარებლები</span>
            </Link>
          </li>
        </ul>
        {zones && zones.length > 0 && (
          <>
            <div className="mt-6 mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-3 uppercase tracking-wider">ჩემი ჯგუფები</div>
            <ul className="space-y-1">
              {zones.map((zone) => (
                <li key={zone.id}>
                  <Link
                    href={`/zone/${zone.slug}`}
                    className="block px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    {zone.slug}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
}
