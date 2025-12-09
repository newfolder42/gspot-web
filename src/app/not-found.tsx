import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">404</h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">გვერდი არ მოიძებნა</p>
        <Link 
          href="/" 
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
        >
          მთავარ გვერდზე დაბრუნება
        </Link>
      </div>
    </main>
  );
}
