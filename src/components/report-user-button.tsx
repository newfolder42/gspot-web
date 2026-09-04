"use client";

import { useState } from 'react';
import ReportModal from '@/components/report-modal';

export default function ReportUserButton({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="მომხმარებლის რეპორტი"
        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm0-9.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5.5Zm0 6.75a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
        </svg>
      </button>

      <ReportModal open={open} targetType="user" targetId={userId} onClose={() => setOpen(false)} />
    </>
  );
}
