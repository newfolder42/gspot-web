import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryBag } from '@/components/inventory/InventoryBag';
import { Colors } from '@/constants/colors';

/** ინვენტარი — reachable from the home header and from your own profile. */
export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // The bag owns its query (page + search filter live inside it), so refresh whatever
  // inventory page is currently on screen rather than lifting that state up here.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['inventory'], type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 16 + insets.bottom }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} tintColor={Colors.brand} />
      }
    >
      <InventoryBag />
    </ScrollView>
  );
}
