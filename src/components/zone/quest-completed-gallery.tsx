import Image from 'next/image';
import ZoomableImage from '@/components/common/zoomable-image';
import type { CompletedQuestPhotoType } from '@/types/quest';

export default function QuestCompletedGallery({ photos, highlightAlias }: { photos: CompletedQuestPhotoType[]; highlightAlias?: string | null }) {
  if (photos.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">სხვების ფოტოები</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, idx) => (
          <div key={`${photo.userId}-${photo.objectiveId}-${idx}`} className="space-y-1">
            <ZoomableImage className={`w-full aspect-square rounded-md ${highlightAlias && photo.userAlias === highlightAlias ? 'ring-2 ring-teal-500' : ''}`}>
              <Image src={photo.photoVariants?.thumb ?? photo.photoUrl} alt={photo.objectiveTitle ?? ''} fill className="object-cover" />
            </ZoomableImage>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{photo.userAlias}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
