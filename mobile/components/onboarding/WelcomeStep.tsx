import type { ComponentProps } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type Feature = {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  text: string;
};

/**
 * What the app does, one entry per capability. Kept as data so a feature can later be
 * lifted out into a step of its own without touching the others.
 * Mirrors web components/onboarding/welcome-step.
 */
const FEATURES: Feature[] = [
  {
    icon: 'image',
    title: 'ატვირთე სურათი',
    text: 'გამოაქვეყნე საქართველოში გადაღებული ფოტო.',
  },
  {
    icon: 'map-pin',
    title: 'გამოიცანი მდებარეობა',
    text: 'მონიშნე რუკაზე სავარაუდო ადგილი. რაც უფრო ახლოს ხარ, მით მეტ ქულას იღებ.',
  },
  {
    icon: 'flag',
    title: 'შეასრულე მისიები',
    text: 'მისიები კონკრეტული ადგილების მოსანახულებლად და ფოტოების გადასაღებად.',
  },
  {
    icon: 'award',
    title: 'გახსენი მიღწევები',
    text: 'აქტივობისთვის დააგროვე ქულები, გახსენი მიღწევები, მიიღე ჯილდოები და აიწიე ლიდერბორდში.',
  },
];

export function WelcomeStep({ padding }: { padding: number }) {
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: padding, paddingTop: 32, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold text-brand mb-6">G&apos;Spot</Text>

      <Text className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
        კეთილი იყოს შენი მობრძანება
      </Text>
      <Text className="mt-3 text-base leading-6 text-zinc-600 dark:text-zinc-300">
        შემოუერთდი ქართულ ლოკაციის გამომცნობ თამაშს
      </Text>

      <View className="mt-8 gap-5">
        {FEATURES.map((feature) => (
          <View key={feature.title} className="flex-row gap-3">
            <Feather name={feature.icon} size={20} color={Colors.brand} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {feature.title}
              </Text>
              <Text className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{feature.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
