type TagBadgeProps = {
  name: string;
  color: string;
};

export default function TagBadge({ name, color }: TagBadgeProps) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-sm font-semibold leading-tight text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
