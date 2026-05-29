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
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: z.string().min(6, 'At least 6 characters').max(128),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
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
      Alert.alert('Password Reset', 'Your password has been updated. Please sign in.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="px-6 py-6">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Reset Password
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          Enter the code we sent to{' '}
          <Text className="text-zinc-700 dark:text-zinc-300 font-medium">{email}</Text>{' '}
          and choose a new password.
        </Text>

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Reset Code"
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
              label="New Password"
              onChangeText={onChange}
              value={value}
              placeholder="Min. 6 characters"
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
              label="Confirm Password"
              onChangeText={onChange}
              value={value}
              placeholder="Repeat your password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <View className="mt-2">
          <Button title="Reset Password" onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>
      </View>
    </ScreenLayout>
  );
}
