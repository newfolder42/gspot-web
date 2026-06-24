import type { ImageVariants } from '@/lib/image-pipeline';

export type ObjectiveTypeId = 'in_range_location' | 'capture_photo';

export type ObjectiveTypeOption = {
  id: ObjectiveTypeId;
  name: string;
  description: string;
};

// Dictionary shown to admins when choosing an objective's type during quest creation.
export const OBJECTIVE_TYPE_OPTIONS: ObjectiveTypeOption[] = [
  {
    id: 'in_range_location',
    name: 'ლოკაციაზე მისვლა',
    description: 'ადგილზე, შემოგარენში სურათის დაფიქსირება.',
  },
  {
    id: 'capture_photo',
    name: 'ფოტოს გადაღება',
    description: 'უბრალოდ სურათის ატივრთვა (ლოკაციის გარეშე).',
  },
];

export type InRangeLocationConfig = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type CapturePhotoConfig = Record<string, never>;

export type ObjectiveConfig = InRangeLocationConfig | CapturePhotoConfig | Record<string, unknown>;

export type ZoneQuestCharacterType = {
  id: number;
  zone_id: number;
  name: string;
  avatar_url: string | null;
  description: string | null;
  created_by: number | null;
  created_at: string;
};

export type ZoneQuestBaseType = {
  id: number;
  zone_id: number;
  title: string;
  description: string | null;
  objective_order: string;
  status: string;
  character_id: number | null;
  required_level: number | null;
  start_date: string | null;
  end_date: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ZoneQuestObjectiveBaseType = {
  id: number;
  quest_id: number;
  title: string | null;
  display_text: string;
  type: ObjectiveTypeId;
  config: ObjectiveConfig;
  sort_order: number;
  created_at: string;
};

export type UserQuestBaseType = {
  id: number;
  quest_id: number;
  user_id: number;
  status: string;
  accepted_at: string;
  completed_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CaptureData = {
  capturedLatitude?: number;
  capturedLongitude?: number;
  distanceMeters?: number;
  captureMethod?: 'exif' | 'live_gps';
  variants?: ImageVariants;
};

export type UserQuestObjectiveBaseType = {
  id: number;
  user_quest_id: number;
  objective_id: number;
  status: string;
  photo_url: string | null;
  capture_data: CaptureData;
  submitted_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

// Quest list row: header + this caller's own progress + completion stats for the zone tab.
export type ZoneQuestWithStatsType = ZoneQuestBaseType & {
  objectiveCount: number;
  activeCount: number; // members currently in progress (accepted, not yet completed)
  completedCount: number; // members who finished
  myStatus: string | null; // null = caller hasn't accepted this quest yet
  characterName: string | null;
  characterAvatarUrl: string | null;
  lockReason: string | null; // null = unlocked for the caller
};

// Objective row joined with the caller's own user_quest_objectives progress, for the detail page.
export type ZoneQuestObjectiveWithProgressType = ZoneQuestObjectiveBaseType & {
  progressStatus: string | null; // null = not attempted yet
  rejectionReason: string | null;
  photoUrl: string | null;
};

export type PendingObjectiveReviewType = {
  id: number; // user_quest_objectives.id
  questId: number;
  objectiveId: number;
  objectiveTitle: string | null;
  displayText: string;
  objectiveType: ObjectiveTypeId;
  photoUrl: string | null;
  photoVariants: ImageVariants | null;
  captureMethod: string | null;
  distanceMeters: number | null;
  radiusMeters: number | null;
  submittedAt: string | null;
  userId: number;
  userAlias: string;
};

// One row per quest with pending reviews, for the zone-wide moderation index.
export type QuestModerationSummaryType = {
  questId: number;
  questTitle: string;
  characterName: string | null;
  characterAvatarUrl: string | null;
  pendingCount: number;
};

export type CompletedQuestPhotoType = {
  objectiveId: number;
  objectiveTitle: string | null;
  photoUrl: string;
  photoVariants: ImageVariants | null;
  userId: number;
  userAlias: string;
  reviewedAt: string | null;
};

// Cross-zone quest log entry: one row per quest the caller has accepted, anywhere.
export type UserQuestLogEntryType = {
  userQuestId: number;
  questId: number;
  questTitle: string;
  questDescription: string | null;
  status: string; // active | completed
  acceptedAt: string;
  completedAt: string | null;
  zoneId: number;
  zoneSlug: string;
  zoneName: string;
  characterName: string | null;
  characterAvatarUrl: string | null;
  objectiveCount: number;
  completedObjectiveCount: number;
};
