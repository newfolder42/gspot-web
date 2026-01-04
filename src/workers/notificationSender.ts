import { getConnecters } from "@/lib/connections";
import { eventBus } from "@/lib/eventBus";
import { createNotification } from "@/lib/notifications";
import { PostCreatedEvent } from "@/types/events/post-created";
import { PostGuessedEvent } from "@/types/events/post-guessed";

export async function registerNotificationHandlers() {
  eventBus.subscribe<PostCreatedEvent>("PostCreated", async (event) => {
    const connections = await getConnecters(event.authorId);

    for (const connection of connections) {
      await createNotification(connection.id, "connection-created-gps-post", {
        postId: event.postId,
        authorId: event.authorId,
        authorAlias: event.authorAlias,
        postType: event.postType || null,
        title: event.postTitle || null,
      });
    }
  });

  eventBus.subscribe<PostGuessedEvent>("PostGuessed", async (event) => {
    await createNotification(event!.authorId, "gps-guess", {
      postId: event.postId,
      userId: event.userId,
      userAlias: event.userAlias,
      score: event.score,
    });
  });
}