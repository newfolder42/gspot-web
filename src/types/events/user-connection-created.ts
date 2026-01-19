export interface UserConnectionCreatedEvent {
  id: number;
  type: string;
  userId: number;
  connectionId: number;
}