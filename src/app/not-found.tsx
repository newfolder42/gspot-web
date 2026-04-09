import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">404</h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">გვერდი არ მოიძებნა</p>
        <Link 
          href="/" 
          className="inline-block px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition"
        >
          მთავარ გვერდზე დაბრუნება
        </Link>
      </div>
    </main>
  );
}
