import type { GpsPostType, HideAndSeekPostType, QuestCompletionPostType } from './post';
import type { HideAndSeekGameType, HideAndSeekPlayerType } from './hide-and-seek';

/**
 * A post as its detail view needs it: the feed shape plus whatever that particular type
 * requires. Adding a type means adding a variant here and a branch in getPostDetail,
 * not another prop on the view.
 */

export type GpsPostDetail = GpsPostType & {
  /** Whether the viewer has already guessed. Meaningless on the other types. */
  alreadyGuessed: boolean;
};

export type QuestPostDetail = QuestCompletionPostType;

export type HideAndSeekPostDetail = HideAndSeekPostType & {
  game: HideAndSeekGameType;
  players: HideAndSeekPlayerType[];
};

export type PostDetailType = GpsPostDetail | QuestPostDetail | HideAndSeekPostDetail;

export function isGpsPostDetail(post: PostDetailType): post is GpsPostDetail {
  return post.type === 'gps-photo';
}

export function isQuestPostDetail(post: PostDetailType): post is QuestPostDetail {
  return post.type === 'quest-completion';
}

export function isHideAndSeekPostDetail(post: PostDetailType): post is HideAndSeekPostDetail {
  return post.type === 'hide-and-seek';
}
