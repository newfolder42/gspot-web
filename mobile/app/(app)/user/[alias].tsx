import { useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ProfileView } from '@/components/profile/ProfileView';
import { useAuth } from '@/contexts/AuthContext';

export default function UserProfileScreen() {
  const { alias } = useLocalSearchParams<{ alias: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [scrolled, setScrolled] = useState(false);

  // The alias is already shown in the profile card, so the header says
  // "ჯისპოტელი" until the card scrolls away, then adds the alias.
  useEffect(() => {
    if (alias) navigation.setOptions({ title: scrolled ? `ჯისპოტელი '${alias}` : 'ჯისპოტელი' });
  }, [alias, scrolled, navigation]);

  return <ProfileView alias={alias} isOwn={user?.alias === alias} onScrolledChange={setScrolled} />;
}
