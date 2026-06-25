import ProfileAvatar from '@/components/common/profileAvatar';
import type { ZoneQuestCharacterType } from '@/types/quest';

export default function CharacterDetail({
  character,
}: {
  character: ZoneQuestCharacterType;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <ProfileAvatar
          name={character.name}
          photoUrl={character.avatar_url}
          className="shrink-0 w-16 h-16 rounded-full"
          initialsClassName="text-lg font-bold"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{character.name}</h1>
        </div>
      </div>

      {character.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
          {character.description}
        </p>
      )}
    </div>
  );
}
