import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 mt-16 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Footer content grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mb-8">

          {/* Column 1: Social + Brand */}
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">კიდევ სხვა</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="https://github.com" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  GitHub
                </Link>
              </li>
              <li>
                <Link href="https://discord.com" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Discord
                </Link>
              </li>
              <li>
                <Link href="mailto:hello@gspot.ge" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Email
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mt-8">
          {/* Footer bottom: logo/brand + copyright */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 md:mb-0">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">G'Spot</span> © 2025. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/sitemap" className="hover:text-zinc-900 dark:hover:text-white transition">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
