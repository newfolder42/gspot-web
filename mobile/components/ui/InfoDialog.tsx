import type { ReactNode } from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { PhotoDialog } from '@/components/ui/PhotoDialog';

type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

const BULLET = /^[-•]\s+/;
/** `**bold**` or `[label](target)`, the only inline markup the help texts use. */
const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
/** `https:`, `mailto:`, …; anything else is an app route. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Blank line = new paragraph; a run of "- " lines = one list. */
function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const raw of source.trim().split('\n')) {
    const line = raw.trim();
    if (!line) {
      current = null;
    } else if (BULLET.test(line)) {
      const item = line.replace(BULLET, '');
      if (current?.type === 'ul') {
        current.items.push(item);
      } else {
        current = { type: 'ul', items: [item] };
        blocks.push(current);
      }
    } else if (current?.type === 'p') {
      current.text += `\n${line}`;
    } else {
      current = { type: 'p', text: line };
      blocks.push(current);
    }
  }
  return blocks;
}

function InlineText({ text, onLink }: { text: string; onLink: (target: string) => void }) {
  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    if (match[1] !== undefined) {
      parts.push(
        <Text key={start} className="font-semibold text-zinc-900 dark:text-zinc-50">
          {match[1]}
        </Text>
      );
    } else {
      const target = match[3];
      parts.push(
        <Text key={start} className="text-teal-600 dark:text-teal-400" onPress={() => onLink(target)}>
          {match[2]}
        </Text>
      );
    }
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <>{parts}</>;
}

type Props = {
  title: string;
  /** Markdown subset, see `constants/infoTopics`. */
  description: string;
  onClose: () => void;
};

/** The one help dialog: titled header with a close button over the rendered description. */
export function InfoDialog({ title, description, onClose }: Props) {
  const router = useRouter();

  const openLink = (target: string) => {
    if (HAS_SCHEME.test(target)) {
      Linking.openURL(target).catch(() => {});
      return;
    }
    // An app screen: leave the dialog first so it doesn't sit on top of where we land.
    onClose();
    router.push(target as Href);
  };

  return (
    <PhotoDialog title={title} onClose={onClose}>
      {parseBlocks(description).map((block, idx) => (
        <View key={idx} className={idx > 0 ? 'mt-3' : ''}>
          {block.type === 'p' ? (
            <Text className="text-sm leading-5 text-zinc-600 dark:text-zinc-400">
              <InlineText text={block.text} onLink={openLink} />
            </Text>
          ) : (
            block.items.map((item, i) => (
              <View key={i} className={`flex-row gap-2 ${i > 0 ? 'mt-1.5' : ''}`}>
                <Text className="text-sm leading-5 text-zinc-400 dark:text-zinc-500">•</Text>
                <Text className="flex-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                  <InlineText text={item} onLink={openLink} />
                </Text>
              </View>
            ))
          )}
        </View>
      ))}
    </PhotoDialog>
  );
}
