// Mirrors the subset of web `src/types/quest.ts` the mobile app consumes.

export type ObjectiveTypeId = 'in_range_location' | 'capture_photo';

// How often a member may take a quest: once ever, once per Tbilisi calendar day, or once
// per Tbilisi calendar week (Monday to Sunday).
export type QuestRepeatability = 'onetime' | 'daily' | 'weekly';

// Badge shown to players; one-time quests carry none.
export const QUEST_REPEATABILITY_LABELS: Record<QuestRepeatability, string | null> = {
  onetime: null,
  daily: 'ყოველდღიური',
  weekly: 'ყოველკვირეული',
};

// Shown once a repeatable quest is done for the current period.
export const QUEST_REPEAT_AVAILABLE_AGAIN: Record<QuestRepeatability, string | null> = {
  onetime: null,
  daily: 'ხელახლა ხელმისაწვდომი იქნება ხვალ',
  weekly: 'ხელახლა ხელმისაწვდომი იქნება მომავალ კვირას',
};

export type InRangeLocationConfig = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type ObjectiveConfig = InRangeLocationConfig | Record<string, unknown>;

export type ZoneQuestCharacterType = {
  id: number;
  zone_id: number;
  name: string;
  slug: string;
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
  repeatability: QuestRepeatability;
  character_id: number | null;
  required_level: number | null;
  start_date: string | null;
  end_date: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type UserQuestBaseType = {
  id: number;
  quest_id: number;
  user_id: number;
  status: string;
  accepted_at: string;
  completed_at: string | null;
  created_at: string;
};

export type ZoneQuestWithStatsType = ZoneQuestBaseType & {
  objectiveCount: number;
  activeCount: number;
  completedCount: number;
  myStatus: string | null;
  characterName: string | null;
  characterAvatarUrl: string | null;
  lockReason: string | null;
};

export type ZoneQuestObjectiveWithProgressType = {
  id: number;
  quest_id: number;
  title: string | null;
  display_text: string;
  type: ObjectiveTypeId;
  config: ObjectiveConfig;
  sort_order: number;
  created_at: string;
  progressStatus: string | null;
  rejectionReason: string | null;
  photoUrl: string | null;
};

export type CompletedQuestPhotoType = {
  objectiveId: number;
  objectiveTitle: string | null;
  photoUrl: string;
  userId: number;
  userAlias: string;
  reviewedAt: string | null;
};

export type UserQuestLogEntryType = {
  userQuestId: number;
  questId: number;
  questTitle: string;
  questDescription: string | null;
  repeatability: QuestRepeatability;
  status: string;
  completionCount: number; // completed runs of this quest; 0 on an active row
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

export type QuestDetailResponse = {
  quest: ZoneQuestBaseType;
  character: ZoneQuestCharacterType | null;
  objectives: ZoneQuestObjectiveWithProgressType[];
  userQuest: UserQuestBaseType | null;
  lockReason: string | null;
  canAccept: boolean;
  canModerate: boolean;
  gallery: CompletedQuestPhotoType[];
};

export type CaptureMethod = 'exif' | 'live_gps';

export type SubmitCaptureResult = {
  success?: boolean;
  inRange?: boolean;
  distanceMeters?: number;
  error?: string;
};

export type AvailableQuestType = {
  questId: number;
  questTitle: string;
  questDescription: string | null;
  repeatability: QuestRepeatability;
  requiredLevel: number | null;
  zoneId: number;
  zoneSlug: string;
  zoneName: string;
  characterId: number | null;
  characterName: string | null;
  characterAvatarUrl: string | null;
  objectiveCount: number;
  activeCount: number;
  completedCount: number;
  lockReason: string | null;
  createdAt: string;
};

export type QuestLogResponse = {
  entries: UserQuestLogEntryType[];
  available: AvailableQuestType[];
};
