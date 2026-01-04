import { BaseEvent } from "./base";

export interface PostCreatedEvent extends BaseEvent {
  type: "PostCreated";
  postId: number;
  postType: string;
  postTitle: string;
  authorId: number;
  authorAlias: string;
  createdAt: Date;
}
