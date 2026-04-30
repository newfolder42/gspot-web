"use client";

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/image-upload';
import { saveZoneMediaAction, saveZoneSettingsAction } from '@/actions/zone-settings';
import { UPLOAD_SIZE_LIMIT } from '@/lib/upload-config';

type ZoneSettingsEditorProps = {
  zoneSlug: string;
  initialDescription: string;
  initialUploadRules: string[];
};

export default function ZoneSettingsEditor({
  zoneSlug,
  initialDescription,
  initialUploadRules,
}: ZoneSettingsEditorProps) {
  const router = useRouter();

  const [description, setDescription] = useState(initialDescription);
  const [rulesText, setRulesText] = useState(initialUploadRules.join('\n'));

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"წარმატებით გაახლდა." | null>(null);

  const [isSaving, startSaving] = useTransition();

  const parsedRules = useMemo(
    () => rulesText.split('\n').map((line) => line.trim()).filter((line) => line.length > 0),
    [rulesText],
  );

  const onSaveSettings = () => {
    setError(null);
    setSuccess(null);

    startSaving(async () => {
      const result = await saveZoneSettingsAction(zoneSlug, {
        description,
        uploadRules: parsedRules,
      });

      if (!result.success) {
        setError(result.error ?? 'დაფიქსირდა ხარვეზი.');
        return;
      }

      setSuccess('წარმატებით გაახლდა.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">

      <section className="">
        <div className="flex gap-3">
          <ImageUpload
            trigger="button"
            buttonLabel="საბზონის პროფილი"
            modalTitle="საბზონის პროფილის გაახლება"
            fileType="profile-photo"
            maxSizeBytes={UPLOAD_SIZE_LIMIT.PROFILE_PHOTO}
            onUploadComplete={async ({ publicUrl, details }) => {
              const result = await saveZoneMediaAction(zoneSlug, {
                contentType: 'profile-photo',
                publicUrl,
                details,
              });
              if (!result.success) {
                return { success: false, error: result.error ?? 'Failed to save profile picture.' };
              }
              return { success: true };
            }}
            onUploaded={() => {
              setSuccess('წარმატებით გაახლდა.');
              setError(null);
              router.refresh();
            }}
          />

          <ImageUpload
            trigger="button"
            buttonLabel="ბანერის სურათი"
            modalTitle="ბანერის სურათის შეცვლა"
            fileType="banner"
            maxSizeBytes={UPLOAD_SIZE_LIMIT.BANNER}
            crop={{ displayWidth: 600, displayHeight: 120, outputWidth: 1920, outputHeight: 384 }}
            onUploadComplete={async ({ publicUrl, details }) => {
              const result = await saveZoneMediaAction(zoneSlug, {
                contentType: 'banner',
                publicUrl,
                details,
              });
              if (!result.success) {
                return { success: false, error: result.error ?? 'დაფიქსირდა ხარვეზი.' };
              }
              return { success: true };
            }}
            onUploaded={() => {
              setSuccess('წარმატებით გაახლდა.');
              setError(null);
              router.refresh();
            }}
          />
        </div>
      </section>

      <section className="">

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="upload-rules" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">აღწერა</label>
            <textarea
              id="zone-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="საბზონის აღწერა"
            />
          </div>

          <div>
            <label htmlFor="upload-rules" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">პოსტის განთავსების წესები</label>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">თითო წესი თითო ხაზზე.</p>
            <textarea
              id="upload-rules"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="თითო წესი თითო ხაზზე"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={onSaveSettings}
            disabled={isSaving}
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </section>
    </div>
  );
}
