"use client";

import { useState, useTransition } from 'react';
import { createZoneTagAction, deleteZoneTagAction } from '@/actions/tags';
import type { ZoneTag } from '@/types/tag';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#1e293b',
];

type Props = {
  zoneSlug: string;
  initialTags: ZoneTag[];
};

export default function ZoneTagsEditor({ zoneSlug, initialTags }: Props) {
  const [tags, setTags] = useState<ZoneTag[]>(initialTags);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    setError(null);

    startTransition(async () => {
      const result = await createZoneTagAction(zoneSlug, { name, color: newColor });
      if (!result.success) {
        setError(result.error ?? 'დაფიქსირდა ხარვეზი.');
        return;
      }
      if (result.tag) setTags(prev => [...prev, result.tag!]);
      setNewName('');
    });
  };

  const handleDelete = (tagId: number) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteZoneTagAction(zoneSlug, tagId);
      if (!result.success) {
        setError(result.error ?? 'დაფიქსირდა ხარვეზი.');
        return;
      }
      setTags(prev => prev.filter(t => t.id !== tagId));
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        თეგები
      </label>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        პოსტს შეიძლება ჰქონდეს მხოლოდ ერთი თეგი. მაქს. 30 თეგი.
      </p>

      {/* Existing tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleDelete(tag.id)}
              disabled={isPending}
              className="flex items-center opacity-70 hover:opacity-100 transition-opacity"
              aria-label={`წაშლა: ${tag.name}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">თეგები არ არის</p>
        )}
      </div>

      {/* Add new tag */}
      {tags.length < 30 && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            maxLength={60}
            placeholder="თეგის სახელი"
            className="flex-1 min-w-0 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 transition"
          />

          {/* Color presets */}
          <div className="flex items-center gap-1">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: newColor === c ? 'white' : 'transparent',
                  outline: newColor === c ? `2px solid ${c}` : 'none',
                  transform: newColor === c ? 'scale(1.2)' : 'scale(1)',
                }}
                aria-label={c}
              />
            ))}
            {/* custom color */}
            <label className="w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-600 overflow-hidden cursor-pointer flex items-center justify-center" title="სხვა ფერი">
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-6 h-6 cursor-pointer border-none p-0 opacity-0 absolute"
              />
              <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            </label>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !newName.trim()}
            className="rounded-md bg-teal-500 px-3 py-2 text-sm font-medium text-black hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            + დამატება
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
