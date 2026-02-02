"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import SignInButton from "./common/signin-button";
import SignUpButton from "./common/signup-button";
import AccountMenu from "./common/account-menu";
import HeaderSearch from "./header-search";
import NotificationDropdown from "./notifications/notification-dropdown";
import MobileNav from "./mobile-nav";
import { getCurrentUser } from "@/lib/session";
import { APP_NAME } from "@/lib/constants";

type HeaderProps = {
  image: {
    url: string;
  };
  headers: {
    title: string;
    link: string;
    children: {
      title: string;
      link: string;
    }[];
  }[];
  user: Awaited<ReturnType<typeof getCurrentUser>>;
};

export default function Header({ image, headers, user }: HeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Left: Logo + Brand */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                className="md:hidden rounded-md inline-flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clipRule="evenodd" />
                </svg>
              </button>
            <Link href="/" className="flex items-center gap-3">
              <Image src={image?.url} alt="Logo" width={40} height={56} style={{ display: 'block' }} />
              <span className="hidden sm:inline-block text-lg font-semibold text-zinc-900 dark:text-zinc-50">{APP_NAME}</span>
            </Link>
          </div>

          {/* Middle: nav links + search (collapsed on very small screens) */}
          <div className="flex-1 flex items-center justify-center px-4">
            <nav className="hidden md:flex items-center space-x-4">
              {headers?.map((h, i) => (
                <Link
                  key={i}
                  href={h.children && h.children.length > 0 ? '#' : `/${h.link ?? ''}`}
                  className="text-sm text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white px-2 py-1 rounded-md transition"
                >
                  {h.title}
                </Link>
              ))}
            </nav>
            <div className="flex w-full max-w-lg items-center">
              <HeaderSearch />
            </div>
          </div>

          {/* Right: Auth buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <AccountMenu user={user} />
                <NotificationDropdown user={user} />
              </>
            ) : (
              <>
                <div className="hidden sm:block">
                  <SignInButton />
                </div>
                <div>
                  <SignUpButton />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
    <MobileNav open={mobileNavOpen} setOpen={setMobileNavOpen} />
    </>
  );
}
