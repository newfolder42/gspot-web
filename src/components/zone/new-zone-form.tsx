"use client";

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createZoneAction, checkZoneSlugAction, type CreateZoneInput } from '@/actions/zones';
import type { ZoneVisibility, ZoneJoinPolicy } from '@/actions/zones';

type SlugStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

export default function NewZoneForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ZoneVisibility>('public');
  const [joinPolicy, setJoinPolicy] = useState<ZoneJoinPolicy>('open');

  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Live slug check while typing
  useEffect(() => {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) { setSlugStatus('idle'); return; }

    if (!/^[a-z0-9_-]+$/i.test(trimmed) || trimmed.length < 3 || trimmed.length > 30) {
      setSlugStatus('invalid');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const { available } = await checkZoneSlugAction(trimmed);
      setSlugStatus(available ? 'available' : 'taken');
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedSlug = slug.trim().toLowerCase();
    if (slugStatus !== 'available') {
      // Re-check on submit in case user didn't wait for debounce
      const { available } = await checkZoneSlugAction(trimmedSlug);
      if (!available) {
        setSlugStatus('taken');
        setError('ეს slug უკვე გამოყენებულია ან არასწორია');
        return;
      }
      setSlugStatus('available');
    }

    if (!name.trim()) {
      setError('სახელი სავალდებულოა');
      return;
    }

    const input: CreateZoneInput = {
      slug: trimmedSlug,
      name: name.trim(),
      description: description.trim(),
      visibility,
      join_policy: joinPolicy,
    };

    startTransition(async () => {
      const result = await createZoneAction(input);
      if (!result.success) {
        setError(result.error ?? 'შეცდომა');
        if (result.error?.includes('slug')) setSlugStatus('taken');
        return;
      }
      router.push(`/zone/${result.slug}`);
    });
  }

  const slugHint = () => {
    if (slugStatus === 'checking') return <span className="text-zinc-400 text-xs">შემოწმება...</span>;
    if (slugStatus === 'available') return <span className="text-teal-600 dark:text-teal-400 text-xs">✓ ხელმისაწვდომია</span>;
    if (slugStatus === 'taken') return <span className="text-red-500 text-xs">✗ დაკავებულია</span>;
    if (slugStatus === 'invalid') return <span className="text-red-500 text-xs">მხოლოდ a–z, 0–9, _ და - (3–30 სიმბოლო)</span>;
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          უნიკალური სახელი <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="my-zone"
            maxLength={30}
            required
            className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
          />
        </div>
        <div className="mt-1 min-h-[1.2rem]">{slugHint()}</div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          სახელი <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ჩემი საბზონა"
          maxLength={80}
          required
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          აღწერა
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="საბზონის მოკლე აღწერა..."
          rows={3}
          maxLength={500}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
        />
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          ხილვადობა
        </label>
        <select
          value={visibility}
          onChange={e => setVisibility(e.target.value as ZoneVisibility)}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
        >
          <option value="public">საჯარო</option>
          <option value="private">დახურული</option>
        </select>
      </div>

      {/* Join policy */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          გაწევრიანების პოლიტიკა
        </label>
        <select
          value={joinPolicy}
          onChange={e => setJoinPolicy(e.target.value as ZoneJoinPolicy)}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
        >
          <option value="open">ღია</option>
          <option value="request">მოთხოვნა</option>
          <option value="invite_only">მხოლოდ მოწვევით</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || slugStatus === 'checking' || slugStatus === 'taken' || slugStatus === 'invalid'}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition"
      >
        {isPending ? 'შექმნა...' : 'საბზონის შექმნა'}
      </button>
    </form>
  );
}
