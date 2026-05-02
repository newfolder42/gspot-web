import Link from "next/link";
import { CompassIcon, HomeIcon, NewUsersIcon } from "@/components/icons";
import { ZoneBaseType } from "@/types/zone";
import ProfileAvatar from "@/components/common/profileAvatar";

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

          <li>
            <Link
              href="/explore-zones"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <CompassIcon className="w-5 h-5" />
              <span>საბზონები</span>
            </Link>
          </li>
        </ul>
        {zones && zones.length > 0 && (
          <>
            <div className="mt-6 mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-3 uppercase tracking-wider">ჩემი საბზონები</div>
            <ul className="space-y-1">
              {zones.map((zone) => (
                <li key={zone.id}>
                  <Link
                    href={`/zone/${zone.slug}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <ProfileAvatar
                      name={zone.slug}
                      photoUrl={zone.profile_photo_url}
                      className="w-5 h-5 rounded-md flex-shrink-0"
                      initialsClassName="text-[9px] font-bold"
                      width={20}
                      height={20}
                    />
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
