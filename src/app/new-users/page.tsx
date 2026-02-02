import Link from 'next/link';
import Image from 'next/image';
import { getNewUsers } from '@/lib/users';
import { formatTimePassed } from '@/lib/dates';
import { NewUser } from '@/types/user';
import { getInitials } from '@/lib/getInitials';

export default async function NewUsersPage() {
  const entries: NewUser[] = await getNewUsers(10, 0);

  return (
    <div className="max-w-4xl mx-auto px-2 py-2 md:py-4">
      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 p-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">მომხმარებლები</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">ბოლოს დარეგისტრირებული მომხმარებლები</p>

        <ol className="space-y-2">
          {entries.map((e, i) => (
            <li key={e.id}>
              <Link href={`/account/${e.alias}`} className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {e.profilePhoto?.url ? (
                      <Image src={e.profilePhoto.url} alt={e.alias} width={48} height={48} className="h-12 w-12 object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{getInitials(e.alias)}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      <span className='text-zinc-900 dark:text-zinc-100'>{`#${i + 1}`}</span>
                      <span className="ml-1 text-zinc-900 dark:text-zinc-100">&apos;{e.alias}</span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatTimePassed(e.createdAt)}</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
