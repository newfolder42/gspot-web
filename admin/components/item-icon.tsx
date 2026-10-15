// Plain <img>: the icons are small files straight from the bucket, and the admin has no
// image optimiser or remote-host config to feed next/image.
export default function ItemIcon({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="h-9 w-9 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700" aria-hidden />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="h-9 w-9 object-contain" />
  );
}
