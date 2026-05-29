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
  name: z.string().min(1, 'Name is required').max(100),
  alias: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'At most 30 characters')
    .regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, _ and - only'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters').max(128),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await register(data.name, data.alias, data.email, data.password);
      // Navigate to OTP verification, passing email as param
      router.push({ pathname: '/(auth)/verify-otp', params: { email: data.email } });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="px-6 py-6">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Create account
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          Fill in the details below to get started.
        </Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Full Name"
              onChangeText={onChange}
              value={value}
              placeholder="John Doe"
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="alias"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Username"
              onChangeText={(t) => onChange(t.toLowerCase())}
              value={value}
              placeholder="john_doe"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              error={errors.alias?.message}
            />
          )}
        />

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
              returnKeyType="next"
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Password"
              onChangeText={onChange}
              value={value}
              placeholder="Min. 6 characters"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              error={errors.password?.message}
            />
          )}
        />

        <View className="mt-2">
          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
          />
        </View>
      </View>
    </ScreenLayout>
  );
}
