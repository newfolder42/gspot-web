import ConnectionsList from '@/components/account/connections-list';

type PageProps = {
  params: Promise<{ userName?: string }>;
};

export default async function AccountConnectionsPage({ params }: PageProps) {
  const { userName } = await params;

  return (
    <div>
      <div className="mt-4">
        <ConnectionsList userName={userName ?? ''} />
      </div>
    </div>
  );
}
