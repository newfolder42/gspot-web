import { createClient, RedisClientType } from "redis";
import { logerror, loginfo } from "./logger";

class EventBus {
  private redisPub?: RedisClientType;
  private initialized = false;

  async publish<T>(resource: string, action: string, payload: T) {
    await loginfo(`Publishing event: ${resource}:${action}`, { payload });
    await this.init();

    if (this.redisPub) {
      try {
        await this.redisPub!.publish(`gspot:${resource}:${action}`, JSON.stringify({
          resource,
          action,
          createdAt: new Date().toISOString(),
          payload
        }));
      } catch (err) {
        await logerror("eventBus: failed to publish to redis", [err]);
      }
    }
  }

  async init() {
    if (this.initialized) return;
    const url = process.env.REDIS_URL;

    this.redisPub = createClient({ url });

    this.redisPub.on("error", async (err: unknown) => {
      await logerror("redis pub error", [err]);
    });

    try {
      await this.redisPub.connect();
      this.initialized = true;
    } catch (err) {
      await logerror("eventBus: failed to connect to redis", [err]);
      // Clean up partially-initialized client
      try {
        await (this.redisPub as any)?.disconnect?.();
      } catch (_) {
        // ignore
      }
      this.redisPub = undefined;
    }
  }
}

export const eventBus = new EventBus();