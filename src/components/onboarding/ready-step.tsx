export default function ReadyStep({ alias }: { alias: string }) {
  return (
    <div className="py-10 text-center">
      <h1 className="text-3xl font-extrabold leading-tight text-zinc-900 dark:text-zinc-50">
        <span className="text-teal-500">&apos;{alias}</span> ჯისპოტელო, შენ მზად ხარ!
      </h1>
    </div>
  );
}
