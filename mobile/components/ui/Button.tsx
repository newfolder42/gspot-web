import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
};

const base = 'flex-row items-center justify-center rounded-xl px-4 py-3.5 min-h-[50px]';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand active:bg-brand-dark',
  secondary: 'bg-zinc-100 dark:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700',
  ghost: 'bg-transparent',
  danger: 'bg-red-500 active:bg-red-600',
};

const textClasses: Record<Variant, string> = {
  primary: 'text-white text-base font-semibold',
  secondary: 'text-zinc-900 dark:text-zinc-100 text-base font-semibold',
  ghost: 'text-brand text-base font-semibold',
  danger: 'text-white text-base font-semibold',
};

const spinnerColor: Record<Variant, string> = {
  primary: '#ffffff',
  secondary: '#71717A',
  ghost: '#FF6314',
  danger: '#ffffff',
};

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`${base} ${variantClasses[variant]} ${isDisabled ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[variant]} />
      ) : (
        <Text className={textClasses[variant]}>{title}</Text>
      )}
    </Pressable>
  );
}
