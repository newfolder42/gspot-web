"use client";

type GameEmbedProps = {
  src?: string;
  title?: string;
  className?: string;
  iframeClassName?: string;
};

export default function GameEmbed({
  src = "/games/damalobana.html",
  title = "3D Multiplayer Game",
  className,
  iframeClassName,
}: GameEmbedProps) {
  return (
    <section className={className}>
      <div className="mx-auto w-full max-w-7xl px-0 sm:px-2">
        <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-black shadow-sm dark:border-zinc-800">
          <iframe
            src={src}
            title={title}
            className={`block h-[clamp(560px,86dvh,980px)] w-full ${iframeClassName ?? ""}`}
            loading="eager"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ border: 0 }}
          />
        </div>
      </div>
    </section>
  );
}
