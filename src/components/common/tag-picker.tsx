"use client";

import type { ZoneTag } from '@/types/tag';

type TagPickerProps = {
  tags: ZoneTag[];
  selectedTagId: number | null;
  onChange: (tagId: number | null) => void;
  noneLabel?: string;
};

export default function TagPicker({
  tags,
  selectedTagId,
  onChange,
  noneLabel = 'თეგის გარეშე',
}: TagPickerProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border transition ${
          selectedTagId === null
            ? 'bg-zinc-900 dark:bg-zinc-700 text-white border-transparent'
            : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400'
        }`}
      >
        {noneLabel}
      </button>

      {tags.map(tag => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onChange(selectedTagId === tag.id ? null : tag.id)}
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border-2 transition"
          style={{
            backgroundColor: selectedTagId === tag.id ? tag.color : 'transparent',
            borderColor: tag.color,
            color: selectedTagId === tag.id ? 'white' : tag.color,
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
