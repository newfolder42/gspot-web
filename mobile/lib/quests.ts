import { apiClient } from '@/lib/api';
import { uploadToSignedUrl } from '@/lib/upload';
import type {
  ZoneQuestWithStatsType,
  ZoneQuestCharacterType,
  UserQuestLogEntryType,
  QuestDetailResponse,
  CaptureMethod,
  SubmitCaptureResult,
} from '@/types/quest';

const enc = encodeURIComponent;

export const questsApi = {
  getZoneQuests: (slug: string): Promise<ZoneQuestWithStatsType[]> =>
    apiClient.get<{ quests: ZoneQuestWithStatsType[] }>(`/zones/${enc(slug)}/quests`).then((r) => r.data.quests),

  getQuest: (slug: string, questId: number): Promise<QuestDetailResponse> =>
    apiClient.get<QuestDetailResponse>(`/zones/${enc(slug)}/quests/${questId}`).then((r) => r.data),

  acceptQuest: (slug: string, questId: number): Promise<{ success: boolean }> =>
    apiClient.post(`/zones/${enc(slug)}/quests/${questId}/accept`).then((r) => r.data),

  getCharacters: (slug: string): Promise<ZoneQuestCharacterType[]> =>
    apiClient.get<{ characters: ZoneQuestCharacterType[] }>(`/zones/${enc(slug)}/characters`).then((r) => r.data.characters),

  getCharacter: (slug: string, characterSlug: string): Promise<ZoneQuestCharacterType> =>
    apiClient.get<{ character: ZoneQuestCharacterType }>(`/zones/${enc(slug)}/characters/${enc(characterSlug)}`).then((r) => r.data.character),

  getLog: (): Promise<UserQuestLogEntryType[]> =>
    apiClient.get<{ entries: UserQuestLogEntryType[] }>(`/quests/log`).then((r) => r.data.entries),

  /**
   * Upload a captured objective photo and submit it for review.
   * Returns the raw result so callers can react to out-of-range responses.
   */
  submitObjectiveCapture: async (params: {
    userQuestId: number;
    objectiveId: number;
    localUri: string;
    mimeType?: string;
    captureMethod?: CaptureMethod;
    capturedLatitude?: number;
    capturedLongitude?: number;
  }): Promise<SubmitCaptureResult> => {
    const { data } = await apiClient.post<{ signedUrl: string }>('/quests/upload-url', {});
    const publicUrl = await uploadToSignedUrl(data.signedUrl, params.localUri, params.mimeType ?? 'image/jpeg');

    const res = await apiClient.post<SubmitCaptureResult>('/quests/objective-capture', {
      userQuestId: params.userQuestId,
      objectiveId: params.objectiveId,
      photoUrl: publicUrl,
      captureMethod: params.captureMethod,
      capturedLatitude: params.capturedLatitude,
      capturedLongitude: params.capturedLongitude,
    });
    return res.data;
  },
};
