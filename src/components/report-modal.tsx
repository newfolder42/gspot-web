"use client";

import { useState } from 'react';
import { submitReport } from '@/lib/reports';
import { REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from '@/types/report';

const REASON_OPTIONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][];

type Props = {
  open: boolean;
  targetType: ReportTargetType;
  targetId: number;
  onClose: () => void;
};

export default function ReportModal({ open, targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const close = () => {
    onClose();
    // Reset after the close animation-less unmount, so the next open starts fresh.
    setReason(null);
    setDetails('');
    setDone(false);
  };

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    const ok = await submitReport(targetType, targetId, reason, details.trim() || undefined);
    setSubmitting(false);
    if (ok) setDone(true);
  };

  return (
    <div className="fixed inset-0 z-layer-modal bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 space-y-4">
        {done ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">გმადლობთ</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">შენი რეპორტი მიღებულია და განიხილება.</p>
            <div className="flex justify-end">
              <button
                onClick={close}
                className="px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                დახურვა
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">რეპორტი</h2>
            <div className="space-y-1.5">
              {REASON_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="დამატებითი დეტალები (არასავალდებულო)"
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={close}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                გაუქმება
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 text-white disabled:opacity-50"
              >
                {submitting ? 'იგზავნება...' : 'გაგზავნა'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
