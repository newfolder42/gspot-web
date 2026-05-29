import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await forgotPassword(data.email);
      // Navigate to reset-password, which combines OTP + new password
      router.push({ pathname: '/(auth)/reset-password', params: { email: data.email } });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="px-6 py-6">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Forgot password?
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          Enter your email and we'll send you a reset code.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              onChangeText={onChange}
              value={value}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              error={errors.email?.message}
            />
          )}
        />

        <View className="mt-2">
          <Button title="Send Reset Code" onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>
      </View>
    </ScreenLayout>
  );
}
