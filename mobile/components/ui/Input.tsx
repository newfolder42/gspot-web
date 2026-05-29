import { forwardRef } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <View className="mb-4">
        {label ? (
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            {label}
          </Text>
        ) : null}

        <TextInput
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
          placeholderTextColor="#71717A"
          {...props}
        />

        {error ? (
          <Text className="text-red-500 text-xs mt-1">{error}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';
