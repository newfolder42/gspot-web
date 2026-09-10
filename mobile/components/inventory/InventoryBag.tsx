import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { inventoryApi } from '@/lib/inventory';
import { INVENTORY_PAGE_SIZE, itemQualityColor, showsItemCount } from '@/types/item';
import type { InventoryItemType } from '@/types/item';
import { Colors, useTheme } from '@/constants/colors';
import { ItemIcon } from './ItemIcon';
import { ItemDetailsModal } from './ItemDetailsModal';

/** 4 across × 2 down at the default page size — big slots, no wasted artwork. */
const COLUMNS = 4;
const SLOT_GAP = 8;

function Slot({ item, size, onPress }: { item: InventoryItemType; size: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={showsItemCount(item) ? `${item.name} (${item.count})` : item.name}
      className="rounded items-center justify-center bg-zinc-100 dark:bg-zinc-900"
      style={{ width: size, height: size, borderWidth: 2, borderColor: itemQualityColor(item.quality) }}
    >
      <ItemIcon iconUrl={item.iconUrl} size={Math.round(size * 0.62)} />
      {/* Stack size, bottom-right like a WoW bag slot. Unique items never show a number. */}
      {showsItemCount(item) && (
        <Text
          className="absolute bottom-0.5 right-1 text-[11px] font-semibold text-white"
          style={{ textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
        >
          {item.count}
        </Text>
      )}
    </Pressable>
  );
}

/** Drawn even where there is nothing, so the bag keeps its shape on every page. */
function EmptySlot({ size }: { size: number }) {
  return (
    <View
      className="rounded border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100/60 dark:bg-zinc-900/60"
      style={{ width: size, height: size }}
    />
  );
}

type Props = {
  /** Slots per page. Passed in so a future bag-size setting only touches the caller. */
  pageSize?: number;
};

export function InventoryBag({ pageSize = INVENTORY_PAGE_SIZE }: Props) {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [nameInput, setNameInput] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [selected, setSelected] = useState<InventoryItemType | null>(null);
  // Slots are sized from the measured grid width so four of them plus the gaps land
  // exactly on the row — percentage widths overflow once a gap is added.
  const [gridWidth, setGridWidth] = useState(0);

  // Debounce typing so a search does not fire one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setNameFilter(nameInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory', page, pageSize, nameFilter],
    queryFn: () => inventoryApi.getPage({ page, pageSize, name: nameFilter }),
  });

  // getInventoryForUser clamps to the last non-empty page; follow it.
  useEffect(() => {
    if (data && data.page !== page) setPage(data.page);
  }, [data, page]);

  const emptySlots = useMemo(
    () => Math.max(0, pageSize - (data?.items.length ?? 0)),
    [pageSize, data]
  );

  const slotSize = gridWidth > 0 ? Math.floor((gridWidth - SLOT_GAP * (COLUMNS - 1)) / COLUMNS) : 0;

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 mb-3">
        <Feather name="search" size={15} color={theme.icon} />
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="ძებნა"
          placeholderTextColor={theme.textMuted}
          className="flex-1 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
        />
      </View>

      <View className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2">
        <View
          className="flex-row flex-wrap"
          style={{ gap: SLOT_GAP, opacity: isLoading ? 0.6 : 1 }}
          onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
        >
          {slotSize > 0 && (data?.items ?? []).map((item) => (
            <Slot key={item.alias} item={item} size={slotSize} onPress={() => setSelected(item)} />
          ))}
          {slotSize > 0 &&
            Array.from({ length: emptySlots }).map((_, index) => (
              <EmptySlot key={`empty-${index}`} size={slotSize} />
            ))}
        </View>
      </View>

      {isLoading && !data && (
        <View className="py-6 items-center">
          <ActivityIndicator color={Colors.brand} />
        </View>
      )}

      <View className="flex-row items-center justify-between mt-3">
        <Pressable
          onPress={() => setPage((current) => Math.max(1, current - 1))}
          disabled={!data || data.page <= 1}
          className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800"
          style={{ opacity: !data || data.page <= 1 ? 0.4 : 1 }}
        >
          <Text className="text-sm text-zinc-700 dark:text-zinc-200">წინა</Text>
        </Pressable>

        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {data ? `${data.page} / ${data.totalPages}` : ''}
          {data ? ` · ${data.totalOwned} ნივთი` : ''}
        </Text>

        <Pressable
          onPress={() => setPage((current) => (data ? Math.min(data.totalPages, current + 1) : current))}
          disabled={!data || data.page >= data.totalPages}
          className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800"
          style={{ opacity: !data || data.page >= data.totalPages ? 0.4 : 1 }}
        >
          <Text className="text-sm text-zinc-700 dark:text-zinc-200">შემდეგი</Text>
        </Pressable>
      </View>

      {selected && <ItemDetailsModal item={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}
