import Image from "next/image";
import Link from "next/link";
import SignInButton from "./common/signin-button";
import SignUpButton from "./common/signup-button";
import AccountMenu from "./common/account-menu";
import { getUserTokenAndValidate } from "@/lib/session";

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
};

const Header = async ({ image, headers }: HeaderProps) => {
  let user: { id?: number, alias?: string } | null = null;
  try {
    const payload = await getUserTokenAndValidate();    
    user = { id: payload.userId, alias: payload.alias };
  } catch (e) {
    user = null;
  }

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image src={image?.url} alt="Logo" width={40} height={56} style={{ display: 'block' }} />
              <span className="hidden sm:inline-block text-lg font-semibold text-zinc-900 dark:text-zinc-50">G'Spot</span>
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
              <div className="relative flex-1">
                <input
                  aria-label="Search"
                  placeholder="მოძებნა ფოტო-სურათი, მომხმარებელი..."
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#00c8ff]"
                />
                <button className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-zinc-600 dark:text-zinc-300">ძებნა</button>
              </div>
            </div>
          </div>

          {/* Right: Auth buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <AccountMenu user={user} />
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
            {/* mobile menu toggle (visual only) */}
            <div className="md:hidden">
              <button aria-label="Open menu" className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-700 dark:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
