import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

export default function VerifyOTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOTP, resendOTP } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && index === 5 && newCode.every((d) => d)) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const codeStr = otpCode ?? code.join('');
    if (codeStr.length !== 6) {
      Alert.alert('შეცდომა', 'გთხოვ შეიყვანე 6-ნიშნა კოდი');
      return;
    }
    setLoading(true);
    try {
      await verifyOTP(email!, codeStr, 'registration');
      Alert.alert('ანგარიში შეიქმნა!', 'ახლა შეგიძლია შეხვიდე.', [
        { text: 'ავტორიზაცია', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('შეცდომა', err.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendOTP(email!);
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      Alert.alert('შეცდომა', err.message);
    }
  };

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

        {/* 6-box OTP input */}
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

        <Button
          title="დადასტურება"
          onPress={() => handleVerify()}
          loading={loading}
        />

        <Pressable
          onPress={handleResend}
          disabled={resendCooldown > 0}
          className="mt-4 items-center"
        >
          <Text className={`text-sm ${resendCooldown > 0 ? 'text-zinc-400' : 'text-brand'}`}>
            {resendCooldown > 0
              ? `კოდის ხელახალი გაგზავნა (${resendCooldown}წმ)`
              : 'კოდის ხელახალი გაგზავნა'}
          </Text>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}
