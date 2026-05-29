import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      // AuthContext updates user → (auth)/_layout redirects to /(app)
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="flex-1 justify-center px-6 py-10">
        {/* Brand */}
        <View className="items-center mb-10">
          <Text className="text-5xl font-bold text-brand">G'Spot</Text>
          <Text className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm text-center">
            Guess where it was taken!
          </Text>
        </View>

        {/* Form */}
        <View>
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
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                error={errors.password?.message}
              />
            )}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable className="mb-6 self-end">
              <Text className="text-brand text-sm">Forgot password?</Text>
            </Pressable>
          </Link>

          <Button title="Sign In" onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>

        {/* Footer */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-zinc-500 dark:text-zinc-400">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text className="text-brand font-semibold">Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScreenLayout>
  );
}
