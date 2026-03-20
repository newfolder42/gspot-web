import SkeletonConnectionCard from '@/components/account/connection-card-skeleton';

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-3">
      {[1, 2, 3].map((i) => (
        <SkeletonConnectionCard key={i} />
      ))}
    </div>
  );
}
