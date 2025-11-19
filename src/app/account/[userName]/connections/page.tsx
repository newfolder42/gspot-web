type PageProps = {
  params: Promise<{ userName?: string }>;
};

import ConnectionsList from '@/components/account/connections-list';

export default async function ConnectionsPage({ params }: PageProps) {
  const { userName } = await params;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Connections</h1>
      <div className="mt-4">
        <ConnectionsList userName={userName ?? ''} />
      </div>
    </div>
  );
}
