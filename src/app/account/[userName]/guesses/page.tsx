import { getAccountByAlias } from '@/lib/account';
import { notFound } from 'next/navigation';
import GuessesHistory from '@/components/guesses-history';
import { getUserGuesses } from '@/lib/posts';

const EMPTY_GUESSES_MESSAGES = [
  'უსაქმურობის სუნი დგას...',
  'ვესტერნის ფილმებში რომ გამხმარი ბალახი დაგორავს ის...',
  'გამოსაცნობი ჯერ კიდევ ბევრია!',
  'აქამდე რა გაუკეთებია რომ ახლა რამე გააკეთოს...',
];

export default async function AccountGuessesPage({ params }: { params: Promise<{ userName: string }> }) {
  const { userName } = await params;

  const data = await getAccountByAlias(userName, null);
  if (!data) return notFound();

  const userGuesses = await getUserGuesses(data.user.id);
  const emptyMessage = EMPTY_GUESSES_MESSAGES[Math.floor(Math.random() * EMPTY_GUESSES_MESSAGES.length)];

  return (
    <GuessesHistory guesses={userGuesses} emptyMessage={emptyMessage} />
  );
}
