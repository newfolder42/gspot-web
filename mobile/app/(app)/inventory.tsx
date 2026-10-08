import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryBag } from '@/components/inventory/InventoryBag';
import { KeyboardScrollView } from '@/components/ui/KeyboardScrollView';
import { Colors, useTheme } from '@/constants/colors';
import { useLayout } from '@/lib/layout';

/** ინვენტარი — reachable from the home header and from your own profile. */
export default function InventoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
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
    <KeyboardScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ flexGrow: 1, padding: 16, paddingHorizontal: 16 + gutter, paddingBottom: 16 + insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} tintColor={Colors.brand} />
      }
    >
      <InventoryBag />
    </KeyboardScrollView>
  );
}
