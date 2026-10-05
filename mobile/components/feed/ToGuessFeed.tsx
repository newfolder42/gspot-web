import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { FeedList } from '@/components/feed/FeedList';
import { feedApi } from '@/lib/feed';

/**
 * The standard to-guess feed. The tab shows the shuffle deck for now (see
 * GuessShuffle); this stays wired up so swapping it back is a one-line change.
 */
export function ToGuessFeed() {
  return (
    <ScreenLayout edges={[]}>
      <FeedList
        queryKey={['to-guess-feed']}
        loader={feedApi.loadToGuess}
        emptyText="გამოსაცნობი ჯერჯერობით არ არის"
      />
    </ScreenLayout>
  );
}
