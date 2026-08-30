import { redirect } from 'next/navigation';

/** Creating a game lives in the shared submit flow now; this keeps old links working. */
export default function Page() {
  redirect('/submit?tab=hide-and-seek');
}
