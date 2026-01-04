import { BaseEvent } from "@/types/events/base";
import { createClient, RedisClientType } from "redis";

type EventHandler<T> = (event: T) => Promise<void> | void;

class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();
  private redisPub?: RedisClientType;
  private redisSub?: RedisClientType;
  private subscribed = new Set<string>();
  private initialized = false;

  subscribe<T>(eventType: string, handler: EventHandler<T>) {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);

    // If already initialized with Redis, ensure we subscribe to channel
    if (this.initialized && this.redisSub && !this.subscribed.has(eventType)) {
      this.subscribed.add(eventType);
      // subscribe returns a promise; message handling is in the callback
      this.redisSub.subscribe(eventType, (message: string) => {
        try {
          const parsed = JSON.parse(message);
          const handlers = this.handlers.get(eventType) ?? [];
          for (const h of handlers) {
            // keep same fire-and-forget behavior
            Promise.resolve().then(() => h(parsed));
          }
        } catch (err: unknown) {
          console.error("eventBus: failed to parse message for event", eventType, err);
        }
      }).catch((err: unknown) => console.error("eventBus: subscribe error", err));
    }
  }

  async publish<T>(event: BaseEvent & T) {
    // fire to local handlers immediately
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      Promise.resolve().then(() => handler(event));
    }

    // publish to Redis for other processes
    if (this.redisPub) {
      try {
        await this.redisPub.publish(event.type, JSON.stringify(event));
      } catch (err) {
        console.error("eventBus: failed to publish to redis", err);
      }
    }
  }

  /**
   * Initialize the Redis clients and subscribe to already-registered event types.
   * Call this once at process startup.
   */
  async init(redisUrl?: string) {
    if (this.initialized) return;
    const url = redisUrl ?? "redis://127.0.0.1:6379";

    this.redisPub = createClient({ url });
    this.redisSub = createClient({ url });

    this.redisPub.on("error", (err: unknown) => console.error("redis pub error", err));
    this.redisSub.on("error", (err: unknown) => console.error("redis sub error", err));

    await Promise.all([this.redisPub.connect(), this.redisSub.connect()]);

    // subscribe to existing event types
    for (const eventType of this.handlers.keys()) {
      if (this.subscribed.has(eventType)) continue;
      this.subscribed.add(eventType);
      this.redisSub.subscribe(eventType, (message: string) => {
        try {
          const parsed = JSON.parse(message);
          const handlers = this.handlers.get(eventType) ?? [];
          for (const h of handlers) {
            Promise.resolve().then(() => h(parsed));
          }
        } catch (err: unknown) {
          console.error("eventBus: failed to parse message for event", eventType, err);
        }
      }).catch((err: unknown) => console.error("eventBus: subscribe error", err));
    }

    this.initialized = true;
  }

  async shutdown() {
    try {
      if (this.redisSub) {
        // unsubscribe all
        for (const ch of this.subscribed) {
          try {
            await this.redisSub.unsubscribe(ch);
          } catch (err) {
            // best-effort
          }
        }
        this.redisSub.destroy();
        this.redisSub = undefined;
      }
      if (this.redisPub) {
        this.redisPub.destroy();
        this.redisPub = undefined;
      }
    } catch (err) {
      console.error("eventBus: shutdown error", err);
    } finally {
      this.initialized = false;
      this.subscribed.clear();
    }
  }
}

export const eventBus = new EventBus();

export const initEventBus = async (redisUrl?: string) => eventBus.init(redisUrl);
export const shutdownEventBus = async () => eventBus.shutdown();