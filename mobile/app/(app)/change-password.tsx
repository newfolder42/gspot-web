import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

const schema = z.object({
  currentPassword: z.string().min(1, 'შეიყვანე მიმდინარე პაროლი'),
  newPassword: z.string().min(6, 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო').max(128),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'პაროლები არ ემთხვევა',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      Alert.alert('პაროლი შეიცვალა!', 'პაროლი წარმატებით შეიცვალა', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('შეცდომა', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll edges={['bottom']}>
      <View className="px-6 py-6">
        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, value } }) => (
            <Input
              label="მიმდინარე პაროლი"
              onChangeText={onChange}
              value={value}
              placeholder="მიმდინარე პაროლი"
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="next"
              error={errors.currentPassword?.message}
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
              label="გაიმეორე ახალი პაროლი"
              onChangeText={onChange}
              value={value}
              placeholder="გაიმეორე ახალი პაროლი"
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
