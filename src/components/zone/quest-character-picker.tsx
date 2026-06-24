"use client";

import { useState, useTransition } from 'react';
import ProfileAvatar from '@/components/common/profileAvatar';
import { createQuestCharacterAction } from '@/actions/quests';
import { PlusIcon } from '@/components/icons';
import type { ZoneQuestCharacterType } from '@/types/quest';

type Props = {
  zoneId: number;
  characters: ZoneQuestCharacterType[];
  selectedCharacterId: number | null;
  onChange: (characterId: number | null) => void;
  onCharacterCreated: (character: ZoneQuestCharacterType) => void;
};

export default function QuestCharacterPicker({
  zoneId,
  characters,
  selectedCharacterId,
  onChange,
  onCharacterCreated,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError('სახელი სავალდებულოა');
      return;
    }
    startTransition(async () => {
      const result = await createQuestCharacterAction(zoneId, {
        name: name.trim(),
        description: description.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      if (!result.success || !result.character) {
        setError(result.error ?? 'შეცდომა');
        return;
      }
      onCharacterCreated(result.character);
      onChange(result.character.id);
      setShowCreate(false);
      setName('');
      setDescription('');
      setAvatarUrl('');
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            onClick={() => onChange(character.id)}
            className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-medium transition ${
              selectedCharacterId === character.id
                ? 'border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-300'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <ProfileAvatar name={character.name} photoUrl={character.avatar_url} className="w-6 h-6 rounded-full shrink-0" />
            {character.name}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          ახალი პერსონაჟი
        </button>
      </div>

      {showCreate && (
        <div className="p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="სახელი, მაგ: მეეზოვე"
            maxLength={100}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="ავატარის URL (არასავალდებულო)"
            maxLength={500}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="მოკლე აღწერა (არასავალდებულო)"
            rows={2}
            maxLength={500}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-violet-500"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? 'შექმნა...' : 'პერსონაჟის შექმნა'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
