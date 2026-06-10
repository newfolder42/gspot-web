import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  // --- Step 1: Email ---
  const handleEmailSubmit = async () => {
    setEmailError(null);
    if (!email) { setEmailError('გთხოვ შეიყვანე მეილი.'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setEmailError(err.message ?? 'დაფიქსირდა შეცდომა.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: OTP ---
  const handleDigitChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && index === 5 && newCode.every((d) => d)) {
      handleOTPVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPVerify = async (otpCode?: string) => {
    const codeStr = otpCode ?? code.join('');
    if (codeStr.length !== 6) { setOtpError('გთხოვ შეიყვანე 6-ნიშნა კოდი'); return; }
    // Don't call verifyOTP here — OTP is verified server-side in resetPassword
    setOtpError(null);
    setStep('password');
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setOtpError('კოდის გაგზავნა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: New password ---
  const handlePasswordSubmit = async () => {
    setPasswordError(null);
    if (!newPassword || !confirmPassword) {
      setPasswordError('გთხოვ შეავსე ყველა ველი.'); return;
    }
    if (newPassword.length < 6) {
      setPasswordError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.'); return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('პაროლები არ ემთხვევა.'); return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code.join(''), newPassword);
      Alert.alert('პაროლი შეიცვალა!', 'ახლა შეგიძლია შეხვიდე ახალი პაროლით.', [
        { text: 'ავტორიზაცია', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      setPasswordError(err.message ?? 'დაფიქსირდა შეცდომა.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Render ----

  if (step === 'otp') {
    return (
      <ScreenLayout scroll>
        <View className="px-6 py-6">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            მეილის დადასტურება
          </Text>
          <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-1">
            გთხოვ შეიყვანე 6-ნიშნა კოდი რომელიც გამოგზავნილია:
          </Text>
          <Text className="text-zinc-700 dark:text-zinc-300 font-medium text-sm mb-6">{email}</Text>

          <View className="flex-row justify-center gap-2 mb-6">
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                value={digit}
                onChangeText={(v) => handleDigitChange(i, v)}
                onKeyPress={(e) => handleKeyPress(i, e.nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!loading}
                placeholderTextColor="#71717A"
                className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50"
              />
            ))}
          </View>

          {otpError ? (
            <Text className="text-red-500 text-sm text-center mb-4">{otpError}</Text>
          ) : null}

          <Button title="გაგრძელება" onPress={() => handleOTPVerify()} />

          <Pressable
            onPress={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="mt-4 items-center"
          >
            <Text className={`text-sm ${resendCooldown > 0 ? 'text-zinc-400' : 'text-brand'}`}>
              {resendCooldown > 0
                ? `კოდის ხელახალი გაგზავნა (${resendCooldown}წმ)`
                : 'კოდის ხელახალი გაგზავნა'}
            </Text>
          </Pressable>

          <Pressable onPress={() => setStep('email')} className="mt-3 items-center">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">← უკან</Text>
          </Pressable>
        </View>
      </ScreenLayout>
    );
  }

  if (step === 'password') {
    return (
      <ScreenLayout scroll>
        <View className="px-6 py-6">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            ახალი პაროლი
          </Text>
          <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
            შეიყვანე ახალი პაროლი ანგარიშისთვის.
          </Text>

          {/* New password */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              ახალი პაროლი
            </Text>
            <View className="relative">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="მინ. 6 სიმბოლო"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                returnKeyType="next"
                placeholderTextColor="#71717A"
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3.5 text-base pr-16 border border-zinc-200 dark:border-zinc-700"
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
          </View>

          <Input
            label="გაიმეორე პაროლი"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="გაიმეორე პაროლი"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handlePasswordSubmit}
          />

          {passwordError ? (
            <Text className="text-red-500 text-sm mb-3">{passwordError}</Text>
          ) : null}

          <View className="mt-2">
            <Button title="პაროლის შეცვლა" onPress={handlePasswordSubmit} loading={loading} />
          </View>
        </View>
      </ScreenLayout>
    );
  }

  // Step: email
  return (
    <ScreenLayout scroll>
      <View className="px-6 py-6">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          პაროლის აღდგენა
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          შეიყვანე მეილი და გამოგიგზავნი კოდს.
        </Text>

        <Input
          label="მეილი"
          value={email}
          onChangeText={(t) => setEmail(t.toLowerCase())}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="done"
          onSubmitEditing={handleEmailSubmit}
          error={emailError ?? undefined}
        />

        <View className="mt-2">
          <Button title="კოდის გაგზავნა" onPress={handleEmailSubmit} loading={loading} />
        </View>
      </View>
    </ScreenLayout>
  );
}
