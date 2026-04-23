"use client"

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { UserIcon, SettingsIcon, LogoutIcon } from "@/components/icons";
import { OwnAccountData } from "@/types/own-account";
import ProfileAvatar from "@/components/common/profileAvatar";

type Props = {
  account: OwnAccountData;
};

export default function AccountMenu({ account }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const photoUrl = account.profilePhoto?.url || null;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function handleSignOut() {
    await signOut({ callbackUrl: '/' });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <ProfileAvatar
          name={account.user.alias}
          photoUrl={photoUrl}
          className="h-8 w-8 rounded-full"
          width={32}
          height={32}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-zinc-900 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 z-50">
          <div className="py-1">
            <Link
              href={`/account/${account.user.alias}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <UserIcon className="w-4 h-4" />
              <span>შენი სივრცე</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>პარამეტრები</span>
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                handleSignOut();
              }}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <LogoutIcon className="w-4 h-4" />
              <span>გასვლა</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
