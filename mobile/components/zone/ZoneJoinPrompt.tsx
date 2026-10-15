import { Text, View } from 'react-native';
import { JoinButton } from '@/components/zone/JoinButton';
import type { ZoneMembershipStatus } from '@/lib/zones';

type Props = {
  slug: string;
  /** The viewer's membership of the zone, null when they never joined. */
  status: ZoneMembershipStatus | null;
  joinPolicy: string;
  /** Called once joining went through, so the screen can re-ask the server what is allowed. */
  onJoined?: () => void;
};

function messageFor(status: ZoneMembershipStatus | null, joinPolicy: string): string {
  if (status === 'banned') return 'ამ საბზონაში მონაწილეობა შეზღუდულია.';
  if (status === 'pending') return 'გაწევრიანება ჯერ არ დადასტურებულა.';
  if (joinPolicy === 'invite_only') return 'ამ საბზონაში მონაწილეობა მხოლოდ მოწვევით შეიძლება.';
  return 'ამ საბზონაში მონაწილეობისთვის (გამოცნობა, კომენტარი, ხმა) ჯერ გაწევრიანდი.';
}

/**
 * Stands where the controls would be when the viewer can read a zone's post but is not an
 * active member of it — a public zone is open for reading, not for taking part.
 * Mirrors web `zone-join-prompt`.
 */
export function ZoneJoinPrompt({ slug, status, joinPolicy, onJoined }: Props) {
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5">
      <Text className="flex-1 text-sm text-zinc-700 dark:text-zinc-300" style={{ minWidth: 180 }}>
        {messageFor(status, joinPolicy)}
      </Text>
      <JoinButton slug={slug} status={status} role={null} joinPolicy={joinPolicy} onChanged={onJoined} />
    </View>
  );
}
