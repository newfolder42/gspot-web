import Image from "next/image";
import Link from "next/link";
import SignInButton from "./common/signin-button";
import SignUpButton from "./common/signup-button";
import AccountMenu from "./common/account-menu";
import HeaderSearch from "./header-search";
import { getCurrentUser } from "@/lib/session";

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
  const user = await getCurrentUser();

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
              <HeaderSearch />
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
