import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
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
});

type FormData = z.infer<typeof schema>;

export default function VerifyOTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOTP, resendOTP } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await verifyOTP(email!, data.code, 'registration');
      Alert.alert('Account Created!', 'You can now sign in.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendOTP(email!);
      Alert.alert('Code Sent', 'A new code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="px-6 py-6">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Verify your email
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          Enter the 6-digit code we sent to{' '}
          <Text className="text-zinc-700 dark:text-zinc-300 font-medium">{email}</Text>.
        </Text>

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Verification Code"
              onChangeText={onChange}
              value={value}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              error={errors.code?.message}
            />
          )}
        />

        <View className="mt-2">
          <Button title="Verify" onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>

        <Pressable
          onPress={handleResend}
          disabled={resending}
          className="mt-4 items-center"
        >
          <Text className="text-brand text-sm">
            {resending ? 'Sending…' : "Didn't receive it? Resend code"}
          </Text>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}
