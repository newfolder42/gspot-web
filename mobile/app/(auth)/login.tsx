import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

const schema = z.object({
  email: z.string().email('მიუთითე სწორი მეილი'),
  password: z.string().min(1, 'პაროლი სავალდებულოა'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      Alert.alert('ავტორიზაცია ვერ მოხერხდა', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="flex-1 justify-center px-6 py-10">
        {/* Brand */}
        <View className="items-center mb-10">
          <Text className="text-5xl font-bold text-brand">G&apos;Spot</Text>
          <Text className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm text-center">
            გამოიცანი სადაა გადაღებული!
          </Text>
        </View>

        {/* Form */}
        <View>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="მეილი"
                onChangeText={(t) => onChange(t.toLowerCase())}
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
            render={({ field: { onChange, value, ref } }) => (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    პაროლი
                  </Text>
                  <Link href="/(auth)/forgot-password" asChild>
                    <Pressable>
                      <Text className="text-brand text-xs">დაგავიწყდა პაროლი?</Text>
                    </Pressable>
                  </Link>
                </View>
                <View className="relative">
                  <TextInput
                    ref={ref}
                    value={value}
                    onChangeText={onChange}
                    placeholder="პაროლი"
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    placeholderTextColor="#71717A"
                    className={[
                      'bg-zinc-100 dark:bg-zinc-800',
                      'text-zinc-900 dark:text-zinc-100',
                      'rounded-xl px-4 py-3.5 text-base pr-16',
                      'border',
                      errors.password ? 'border-red-400 dark:border-red-500' : 'border-zinc-200 dark:border-zinc-700',
                    ].join(' ')}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-0 bottom-0 justify-center px-1"
                  >
                    <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {showPassword ? 'დამალე' : 'ნახვა'}
                    </Text>
                  </Pressable>
                </View>
                {errors.password && (
                  <Text className="text-red-500 text-xs mt-1">{errors.password.message}</Text>
                )}
              </View>
            )}
          />

          <Button title="ავტორიზაცია" onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>

        {/* Footer */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-zinc-500 dark:text-zinc-400">არ გაქვს ანგარიში? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text className="text-brand font-semibold">რეგისტრაცია</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScreenLayout>
  );
}
