import { forwardRef } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/constants/colors';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Marks the label with a red asterisk. Only a marker: validating is up to the caller. */
  required?: boolean;
  /** A muted line under the field, replaced by `error` when there is one. */
  hint?: string;
};

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, required, hint, ...props }, ref) => {
    const theme = useTheme();

    return (
      <View className="mb-4">
        {label ? (
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            {label}
            {required ? <Text className="text-rose-500"> *</Text> : null}
          </Text>
        ) : null}

        <TextInput
          disableFullscreenUI
          ref={ref}
          className={[
            'bg-zinc-100 dark:bg-zinc-800',
            'text-zinc-900 dark:text-zinc-100',
            'rounded-xl px-4 py-3.5 text-base',
            'border',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-zinc-200 dark:border-zinc-700',
          ].join(' ')}
          placeholderTextColor={theme.textMuted}
          {...props}
        />

        {error ? (
          <Text className="text-red-500 text-xs mt-1">{error}</Text>
        ) : hint ? (
          <Text className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{hint}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';
