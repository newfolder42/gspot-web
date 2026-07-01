import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { FeedList } from '@/components/feed/FeedList';
import { feedApi } from '@/lib/feed';

export default function ToGuessScreen() {
  return (
    <ScreenLayout>
      <FeedList
        queryKey={['to-guess-feed']}
        loader={feedApi.loadToGuess}
        emptyText="გამოსაცნობი ჯერჯერობით არ არის"
      />
    </ScreenLayout>
  );
}
