"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createQuestAction } from '@/actions/quests';
import type { CreateQuestActionInput, QuestObjectiveOrder } from '@/actions/quests';
import QuestObjectiveMapPicker from './quest-objective-map-picker';
import QuestCharacterPicker from './quest-character-picker';
import { PlusIcon, XIcon, MapPinIcon } from '@/components/icons';
import { mapDefaultCenter } from '@/lib/map';
import { formatCoordinates } from '@/lib/utils';
import { OBJECTIVE_TYPE_OPTIONS } from '@/types/quest';
import type { ObjectiveTypeId, ZoneQuestCharacterType } from '@/types/quest';

type ObjectiveForm = {
  key: string;
  title: string;
  displayText: string;
  type: ObjectiveTypeId;
  radiusMeters: number;
  latitude: number;
  longitude: number;
  mapRevealed: boolean;
};

function newObjective(): ObjectiveForm {
  return {
    key: crypto.randomUUID(),
    title: '',
    displayText: '',
    type: 'in_range_location',
    radiusMeters: 50,
    latitude: mapDefaultCenter[1],
    longitude: mapDefaultCenter[0],
    mapRevealed: false,
  };
}

type Props = {
  zoneId: number;
  zoneSlug: string;
  characters: ZoneQuestCharacterType[];
};

export default function NewQuestForm({ zoneId, zoneSlug, characters: initialCharacters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectiveOrder, setObjectiveOrder] = useState<QuestObjectiveOrder>('ordered');
  const [objectives, setObjectives] = useState<ObjectiveForm[]>([newObjective()]);
  const [characters, setCharacters] = useState(initialCharacters);
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [requiredLevel, setRequiredLevel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  function updateObjective(key: string, patch: Partial<ObjectiveForm>) {
    setObjectives((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  }

  function addObjective() {
    setObjectives((prev) => [...prev, newObjective()]);
  }

  function removeObjective(key: string) {
    setObjectives((prev) => (prev.length > 1 ? prev.filter((o) => o.key !== key) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('სათაური სავალდებულოა');
      return;
    }
    if (!characterId) {
      setError('პერსონაჟის შერჩევა სავალდებულოა');
      return;
    }
    for (const obj of objectives) {
      if (!obj.displayText.trim()) {
        setError('ყველა ამოცანას უნდა ჰქონდეს აღწერა');
        return;
      }
      if (obj.type === 'in_range_location' && (!obj.radiusMeters || obj.radiusMeters <= 0)) {
        setError('არასწორი რადიუსი');
        return;
      }
    }
    if (startDate && endDate && endDate < startDate) {
      setError('დასასრულის თარიღი არ შეიძლება დაწყებამდე იყოს');
      return;
    }

    const input: CreateQuestActionInput = {
      title: title.trim(),
      description: description.trim() || null,
      objectiveOrder,
      objectives: objectives.map((o) => ({
        title: o.title.trim() || null,
        displayText: o.displayText.trim(),
        type: o.type,
        ...(o.type === 'in_range_location'
          ? { latitude: o.latitude, longitude: o.longitude, radiusMeters: o.radiusMeters }
          : {}),
      })),
      characterId,
      requiredLevel: requiredLevel.trim() ? Number(requiredLevel) : null,
      startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null,
      endDate: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null,
    };

    startTransition(async () => {
      const result = await createQuestAction(zoneId, input);
      if (!result.success) {
        setError(result.error ?? 'შეცდომა');
        return;
      }
      router.push(`/zone/${zoneSlug}/quests/${result.questId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          სათაური <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="მისიის სათაური"
          maxLength={150}
          required
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          აღწერა
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="მისიის აღწერა..."
          rows={2}
          maxLength={1000}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          მისიის პერსონაჟი <span className="text-red-500">*</span>
        </label>
        <QuestCharacterPicker
          zoneId={zoneId}
          characters={characters}
          selectedCharacterId={characterId}
          onChange={setCharacterId}
          onCharacterCreated={(c) => setCharacters((prev) => [...prev, c])}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          ამოცანების მიმდევრობა
        </label>
        <select
          value={objectiveOrder}
          onChange={(e) => setObjectiveOrder(e.target.value as QuestObjectiveOrder)}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
        >
          <option value="ordered">თანმიმდევრობით</option>
          <option value="unordered">თანმიმდევრობის გარეშე</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            დაწყება
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            დასრულება
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            საჭირო დონე
          </label>
          <input
            type="number"
            value={requiredLevel}
            onChange={(e) => setRequiredLevel(e.target.value)}
            placeholder="არასავალდ."
            min={1}
            max={999}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ამოცანები</h3>
          <button
            type="button"
            onClick={addObjective}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            ამოცანის დამატება
          </button>
        </div>

        {objectives.map((obj, idx) => {
          const typeOption = OBJECTIVE_TYPE_OPTIONS.find((t) => t.id === obj.type);
          return (
            <div key={obj.key} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">ამოცანა #{idx + 1}</span>
                {objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObjective(obj.key)}
                    className="text-zinc-400 hover:text-red-500"
                    aria-label="ამოცანის წაშლა"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={obj.type}
                  onChange={(e) => updateObjective(obj.key, { type: e.target.value as ObjectiveTypeId })}
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
                >
                  {OBJECTIVE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
                {typeOption && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{typeOption.description}</p>
                )}
              </div>

              <input
                type="text"
                value={obj.title}
                onChange={(e) => updateObjective(obj.key, { title: e.target.value })}
                placeholder="სათაური (არასავალდებულო)"
                maxLength={150}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
              />

              <textarea
                value={obj.displayText}
                onChange={(e) => updateObjective(obj.key, { displayText: e.target.value })}
                placeholder="რა უნდა გააკეთოს მოთამაშემ..."
                rows={2}
                maxLength={500}
                required
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none resize-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
              />

              {obj.type === 'in_range_location' && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">რადიუსი (მ)</label>
                    <input
                      type="number"
                      value={obj.radiusMeters}
                      onChange={(e) => updateObjective(obj.key, { radiusMeters: Number(e.target.value) })}
                      min={5}
                      max={5000}
                      className="w-24 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
                    />
                  </div>

                  {obj.mapRevealed ? (
                    <QuestObjectiveMapPicker
                      latitude={obj.latitude}
                      longitude={obj.longitude}
                      onChange={(coords) => updateObjective(obj.key, coords)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateObjective(obj.key, { mapRevealed: true })}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        {formatCoordinates(obj.latitude, obj.longitude)}
                      </span>
                      <span className="font-medium text-teal-600 dark:text-teal-400">რუკაზე მონიშვნა</span>
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition"
      >
        {isPending ? 'შექმნა...' : 'მისიის შექმნა'}
      </button>
    </form>
  );
}
