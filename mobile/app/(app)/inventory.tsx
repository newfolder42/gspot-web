import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryBag } from '@/components/inventory/InventoryBag';

/** ინვენტარი — reachable from the home header and from your own profile. */
export default function InventoryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      style={{ padding: 16, paddingBottom: 16 + insets.bottom }}
    >
      <InventoryBag />
    </View>
  );
}
