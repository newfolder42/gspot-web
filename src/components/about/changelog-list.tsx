"use client";

import { useState } from "react";
import { changelog } from "@/lib/changelog";


export default function ChangelogList() {
  const [visibleCount, setVisibleCount] = useState(5);
  const visible = changelog.slice(0, visibleCount);

  return (
    <ul className="px-2 space-y-2">
      {visible.map((rel) => (
        <div key={rel.version} className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rel.version}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{rel.date}</span>
          </div>
          <ul className="px-4 py-3 list-disc list-inside text-sm text-zinc-700 dark:text-zinc-200">
            {rel.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      ))}

      {changelog.length > visibleCount && (
        <div className="px-6 py-2">
          <button
            onClick={() => setVisibleCount(changelog.length)}
            className="text-sm text-teal-600 hover:underline"
          >
            მეტის ნახვა
          </button>
        </div>
      )}
    </ul>
  );
}
