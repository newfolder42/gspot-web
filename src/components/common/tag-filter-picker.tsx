"use client";

import type { ZoneTag } from '@/types/tag';

type TagFilterPickerProps = {
  tags: ZoneTag[];
  selectedTagId: number | null;
  onChange: (tagId: number | null) => void;
  noneLabel?: string;
};

export default function TagFilterPicker({
  tags,
  selectedTagId,
  onChange,
  noneLabel = 'ყველა თეგი',
}: TagFilterPickerProps) {
  if (tags.length === 0) return null;

  return (
    <select
      value={selectedTagId ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="px-3 py-2 rounded-md text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
      <option value="">{noneLabel}</option>
      {tags.map(tag => (
        <option key={tag.id} value={tag.id}>
          {tag.name}
        </option>
      ))}
    </select>
  );
}
