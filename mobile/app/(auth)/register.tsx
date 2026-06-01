import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

type AliasStatus = 'checking' | 'available' | 'taken' | 'invalid' | null;
type EmailStatus = 'valid' | 'invalid' | 'blocked' | null;
type PasswordStatus = 'invalid' | null;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [aliasStatus, setAliasStatus] = useState<AliasStatus>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(null);
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus>(null);
  const [error, setError] = useState<string | null>(null);

  // Alias availability check (debounced)
  useEffect(() => {
    if (!alias) { setAliasStatus(null); return; }
    if (alias.length < 3 || alias.length > 30 || !/^[a-z0-9_-]+$/.test(alias)) {
      setAliasStatus('invalid');
      return;
    }
    setAliasStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await authApi.checkAlias(alias);
        setAliasStatus(res.available ? 'available' : 'taken');
      } catch {
        setAliasStatus(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [alias]);

  // Email validation
  useEffect(() => {
    if (!email) { setEmailStatus(null); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setEmailStatus('invalid'); return; }
    if (email.toLowerCase().endsWith('.ru') || email.toLowerCase().includes('.ru.')) {
      setEmailStatus('blocked'); return;
    }
    setEmailStatus('valid');
  }, [email]);

  // Password validation
  useEffect(() => {
    if (!password) { setPasswordStatus(null); return; }
    setPasswordStatus(password.length < 6 ? 'invalid' : null);
  }, [password]);

  const canSubmit =
    aliasStatus === 'available' &&
    emailStatus === 'valid' &&
    passwordStatus === null &&
    password.length >= 6;

  const onSubmit = async () => {
    setError(null);
    if (!alias || !email || !password) {
      setError('გთხოვ შეავსე ყველა ველი.');
      return;
    }
    if (!canSubmit) {
      setError('გთხოვ შეავსე ველები ვალიდურად.');
      return;
    }
    setLoading(true);
    try {
      await register(alias, alias, email, password);
      router.push({ pathname: '/(auth)/verify-otp', params: { email } });
    } catch (err: any) {
      if (err.message?.includes('USER_EXISTS') || err.message?.includes('ALIAS_EXISTS')) {
        setError('მომხმარებელი ამ მეილით ან თიკუნით უკვე არსებობს.');
      } else {
        setError(err.message ?? 'დაფიქსირდა შეცდომა. გთხოვ ხელახლა სცადე.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scroll>
      <View className="px-6 py-6">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          შემოგვიერთდი
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          შეავსე ველები რეგისტრაციისთვის.
        </Text>

        {/* Alias */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            თიკუნი
          </Text>
          <View className="relative">
            <TextInput
              value={alias}
              onChangeText={(t) => setAlias(t.toLowerCase())}
              placeholder="უნიკალური სახელი"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              placeholderTextColor="#71717A"
              className={[
                'bg-zinc-100 dark:bg-zinc-800',
                'text-zinc-900 dark:text-zinc-100',
                'rounded-xl px-4 py-3.5 text-base pr-12',
                'border',
                aliasStatus === 'invalid' || aliasStatus === 'taken'
                  ? 'border-red-400 dark:border-red-500'
                  : aliasStatus === 'available'
                  ? 'border-green-400 dark:border-green-500'
                  : 'border-zinc-200 dark:border-zinc-700',
              ].join(' ')}
            />
            {alias ? (
              <View className="absolute right-3 top-0 bottom-0 justify-center">
                {aliasStatus === 'checking' && (
                  <View className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-zinc-700" />
                )}
                {aliasStatus === 'available' && (
                  <Text className="text-green-500 font-bold text-base">✓</Text>
                )}
                {(aliasStatus === 'taken' || aliasStatus === 'invalid') && (
                  <Text className="text-red-500 font-bold text-base">✗</Text>
                )}
              </View>
            ) : null}
          </View>
          {aliasStatus === 'invalid' && alias ? (
            <Text className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
              3-30 სიმბოლო, დასაშვებია: ასოები, რიცხვები, _ და -
            </Text>
          ) : null}
          {aliasStatus === 'taken' ? (
            <Text className="text-red-500 text-xs mt-1">დაკავებულია ან შეზღუდულია</Text>
          ) : null}
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            მეილი
          </Text>
          <View className="relative">
            <TextInput
              value={email}
              onChangeText={(t) => setEmail(t.toLowerCase())}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              placeholderTextColor="#71717A"
              className={[
                'bg-zinc-100 dark:bg-zinc-800',
                'text-zinc-900 dark:text-zinc-100',
                'rounded-xl px-4 py-3.5 text-base pr-12',
                'border',
                emailStatus === 'invalid' || emailStatus === 'blocked'
                  ? 'border-red-400 dark:border-red-500'
                  : emailStatus === 'valid'
                  ? 'border-green-400 dark:border-green-500'
                  : 'border-zinc-200 dark:border-zinc-700',
              ].join(' ')}
            />
            {email ? (
              <View className="absolute right-3 top-0 bottom-0 justify-center">
                {emailStatus === 'valid' && (
                  <Text className="text-green-500 font-bold text-base">✓</Text>
                )}
                {(emailStatus === 'invalid' || emailStatus === 'blocked') && (
                  <Text className="text-red-500 font-bold text-base">✗</Text>
                )}
              </View>
            ) : null}
          </View>
          {emailStatus === 'invalid' && email ? (
            <Text className="text-red-500 text-xs mt-1">გთხოვ შეიყვანე მართებული მეილი</Text>
          ) : null}
          {emailStatus === 'blocked' && email ? (
            <Text className="text-red-500 text-xs mt-1">.ru დომენები დაბლოკილია</Text>
          ) : null}
        </View>

        {/* Password */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            პაროლი
          </Text>
          <View className="relative">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="123456 არა"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              placeholderTextColor="#71717A"
              className={[
                'bg-zinc-100 dark:bg-zinc-800',
                'text-zinc-900 dark:text-zinc-100',
                'rounded-xl px-4 py-3.5 text-base pr-16',
                'border',
                passwordStatus === 'invalid'
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-zinc-200 dark:border-zinc-700',
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
          {passwordStatus === 'invalid' && password ? (
            <Text className="text-red-500 text-xs mt-1">
              პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო
            </Text>
          ) : null}
        </View>

        {error ? <Text className="text-red-500 text-sm mb-3">{error}</Text> : null}

        <View className="mt-2">
          <Button title="რეგისტრაცია" onPress={onSubmit} loading={loading} />
        </View>

        <View className="flex-row justify-center mt-6">
          <Text className="text-zinc-500 dark:text-zinc-400">გაქვს უკვე ანგარიში? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-brand font-semibold">ავტორიზაცია</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScreenLayout>
  );
}
