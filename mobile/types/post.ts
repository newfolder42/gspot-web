import type { PostCommentType } from '@/types/post-comment';

export type MobilePostType = {
  id: number;
  type: 'gps-photo' | 'text';
  title: string;
  userId: number;
  author: string;
  date: string;
  status: 'processing' | 'published' | 'failed' | 'deleted';
  zoneId: number;
  zoneSlug?: string;
  zoneProfilePhoto?: string | null;
  image: string;
  dateTaken?: string | null;
  guessCount?: number | null;
  commentCount?: number | null;
  userHasGuessed?: boolean;
  tag?: { id: number; name: string; color: string } | null;
  authorLevel?: number | null;
};

export type PostDetailResponse = {
  post: MobilePostType;
  alreadyGuessed: boolean;
  comments: PostCommentType[];
};
