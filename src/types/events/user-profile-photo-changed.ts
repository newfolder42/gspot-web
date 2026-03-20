export interface UserProfilePhotoChangedEvent {
  contentId: number;
  userId: number;
  userAlias: string;
  profilePhotoUrl: string;
  previousProfilePhotoUrl: string | null;
  replacedExisting: boolean;
}