import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { BookmarksList } from '@/components/bookmarks/BookmarksList';

export default function BookmarksScreen() {
  return (
    <ScreenLayout edges={[]}>
      <BookmarksList />
    </ScreenLayout>
  );
}
