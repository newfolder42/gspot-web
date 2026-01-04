import { BaseEvent } from "./base";

export interface PostGuessedEvent extends BaseEvent {
  type: "PostGuessed";
  postId: number;
  guessType: string;
  authorId: number;
  authorAlias: string;
  userId: number;
  userAlias: string;
  score: number;
  createdAt: Date;
}
