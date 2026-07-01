import { useEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ProfileView } from '@/components/profile/ProfileView';
import { useAuth } from '@/contexts/AuthContext';

export default function UserProfileScreen() {
  const { alias } = useLocalSearchParams<{ alias: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (alias) navigation.setOptions({ title: `'${alias}` });
  }, [alias, navigation]);

  return <ProfileView alias={alias} isOwn={user?.alias === alias} />;
}
