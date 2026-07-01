import { View, Text } from 'react-native';
import { ProfileView } from '@/components/profile/ProfileView';
import { useAuth } from '@/contexts/AuthContext';

export default function AccountScreen() {
  const { user } = useAuth();

  if (!user?.alias) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">ანგარიში მიუწვდომელია</Text>
      </View>
    );
  }

  return <ProfileView alias={user.alias} isOwn />;
}
