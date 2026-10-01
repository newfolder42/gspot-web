import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

type Props = {
  name: string;
  zoneSlug: string;
  /** Without a slug the name renders as plain text. */
  characterSlug?: string | null;
  /** Override navigation, e.g. to close a modal first. Defaults to router.push. */
  onNavigate?: (path: any, params?: any) => void;
};

/** Mirrors web CharacterLink: character name linking to its zone character page. */
export function CharacterLink({ name, zoneSlug, characterSlug, onNavigate }: Props) {
  const router = useRouter();
  const label = <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{name}</Text>;

  if (!characterSlug) return label;

  const path = '/(app)/zone/[slug]/characters/[characterSlug]';
  const params = { slug: zoneSlug, characterSlug };

  return (
    <Pressable
      hitSlop={6}
      onPress={() => (onNavigate ? onNavigate(path, params) : router.push({ pathname: path, params }))}
    >
      {label}
    </Pressable>
  );
}
