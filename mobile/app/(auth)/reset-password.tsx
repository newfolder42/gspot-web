import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'შეიყვანე 6-ნიშნა კოდი'),
  newPassword: z.string().min(6, 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო').max(128),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'პაროლები არ ემთხვევა',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await resetPassword(email!, data.code, data.newPassword);
      Alert.alert('პაროლი შეიცვალა!', 'ახლა შეგიძლია შეხვიდე ახალი პაროლით.', [
        { text: 'ავტორიზაცია', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('შეცდომა', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="px-6 py-6">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          ახალი პაროლი
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          შეიყვანე კოდი რომელიც გამოგზავნილია{' '}
          <Text className="text-zinc-700 dark:text-zinc-300 font-medium">{email}</Text>-ზე{' '}
          და შეარჩიე ახალი პაროლი.
        </Text>

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <Input
              label="განახლების კოდი"
              onChangeText={onChange}
              value={value}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="next"
              error={errors.code?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, value } }) => (
            <Input
              label="ახალი პაროლი"
              onChangeText={onChange}
              value={value}
              placeholder="მინ. 6 სიმბოლო"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
              error={errors.newPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <Input
              label="გაიმეორე პაროლი"
              onChangeText={onChange}
              value={value}
              placeholder="გაიმეორე პაროლი"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <View className="mt-2">
          <Button title="პაროლის შეცვლა" onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>
      </View>
    </ScreenLayout>
  );
}
