import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';
import { eventBus } from '@/lib/eventBus';
import { deleteObject } from '@/lib/s3';
import { processUploadedPhoto } from '@/lib/image-pipeline';
import { type PostCreatedEvent } from '@/types/events/post-created';
import { type UserProfilePhotoChangedEvent } from '@/types/events/user-profile-photo-changed';

type CreateMobilePostParams = {
  userId: number;
  userAlias: string;
  title?: string;
  contentId: number;
  zoneId: number;
  zoneSlug: string;
  status?: 'processing' | 'published' | 'failed';
  idempotencyKey?: string | null;
  tagId?: number | null;
};

type StoreMobileContentParams = {
  userId: number;
  publicUrl: string;
  details: {
    originalFileName: string;
    fileSize: number;
    coordinates: { latitude: number; longitude: number };
    dateTaken: string | null;
  };
};

export async function storeMobileGpsPhotoContent({
  userId,
  publicUrl,
  details,
}: StoreMobileContentParams): Promise<{ id: number } | null> {
  try {
    let storedUrl = publicUrl;
    let storedDetails: StoreMobileContentParams['details'] & { variants?: unknown } = details;
    const processed = await processUploadedPhoto(publicUrl);
    if (processed) {
      storedUrl = processed.displayUrl;
      storedDetails = { ...details, variants: processed.variants };
    }
    // On failure, fall back to the original upload URL with no variants.

    const res = await query(
      `INSERT INTO user_content (user_id, type, public_url, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [userId, 'gps-photo', storedUrl, JSON.stringify(storedDetails)]
    );

    if ((res.rowCount ?? 0) === 0) return null;
    return { id: Number(res.rows[0].id) };
  } catch (err) {
    await logerror('storeMobileGpsPhotoContent error', [err]);
    return null;
  }
}

type StoreMobileProfilePhotoParams = {
  userId: number;
  userAlias: string;
  publicUrl: string;
  details?: Record<string, unknown>;
};

/**
 * Store (or replace) a user's profile photo. Mirrors the `profile-photo` branch of
 * `lib/content.ts#storeContent`, but takes an explicit `userId` so it can be called from
 * the mobile API layer. Deletes the previous S3 object, upserts `user_content`, and
 * publishes the `user_profile_photo:changed` event. No image processing — the client
 * uploads an already-cropped square (matching the web flow).
 */
export async function storeMobileProfilePhoto({
  userId,
  userAlias,
  publicUrl,
  details = {},
}: StoreMobileProfilePhotoParams): Promise<{ id: number; url: string } | null> {
  try {
    const existingRes = await query(
      `SELECT id, public_url FROM user_content
       WHERE user_id = $1 AND type = 'profile-photo'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];

      if (existing.public_url) {
        try {
          const key = new URL(existing.public_url).pathname.replace(/^\//, '');
          await deleteObject(key);
        } catch (s3Err) {
          console.warn('Failed to delete existing S3 object for profile-photo', s3Err);
        }
      }

      const upd = await query(
        `UPDATE user_content SET public_url = $1, details = $2, created_at = NOW() WHERE id = $3 RETURNING id`,
        [publicUrl, JSON.stringify(details), existing.id]
      );

      if ((upd.rowCount ?? 0) === 0) return null;

      await publishProfilePhotoChanged({
        contentId: Number(upd.rows[0].id),
        userId,
        userAlias,
        profilePhotoUrl: publicUrl,
        previousProfilePhotoUrl: existing.public_url ?? null,
        replacedExisting: true,
      });

      return { id: Number(upd.rows[0].id), url: publicUrl };
    }

    const res = await query(
      `INSERT INTO user_content (user_id, type, public_url, details, created_at)
       VALUES ($1, 'profile-photo', $2, $3, NOW())
       RETURNING id`,
      [userId, publicUrl, JSON.stringify(details)]
    );

    if ((res.rowCount ?? 0) === 0) return null;

    await publishProfilePhotoChanged({
      contentId: Number(res.rows[0].id),
      userId,
      userAlias,
      profilePhotoUrl: publicUrl,
      previousProfilePhotoUrl: null,
      replacedExisting: false,
    });

    return { id: Number(res.rows[0].id), url: publicUrl };
  } catch (err) {
    await logerror('storeMobileProfilePhoto error', [err]);
    return null;
  }
}

async function publishProfilePhotoChanged(event: UserProfilePhotoChangedEvent) {
  try {
    await eventBus.publish('user_profile_photo', 'changed', event);
  } catch (err) {
    console.warn('Failed to publish user_profile_photo:changed event', err);
  }
}

export async function createMobilePost({
  userId,
  userAlias,
  title,
  contentId,
  zoneId,
  zoneSlug,
  status = 'published',
  idempotencyKey,
  tagId,
}: CreateMobilePostParams): Promise<number | null> {
  try {
    if (idempotencyKey) {
      const existingReq = await query(
        `SELECT post_id FROM post_submit_requests WHERE user_id = $1 AND request_id = $2 LIMIT 1`,
        [userId, idempotencyKey]
      );

      if ((existingReq.rowCount ?? 0) > 0 && existingReq.rows[0].post_id != null) {
        return Number(existingReq.rows[0].post_id);
      }

      const claimReq = await query(
        `INSERT INTO post_submit_requests (user_id, request_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, request_id) DO NOTHING
         RETURNING id`,
        [userId, idempotencyKey]
      );

      if ((claimReq.rowCount ?? 0) === 0) {
        const claimedReq = await query(
          `SELECT post_id FROM post_submit_requests WHERE user_id = $1 AND request_id = $2 LIMIT 1`,
          [userId, idempotencyKey]
        );

        if ((claimedReq.rowCount ?? 0) > 0 && claimedReq.rows[0].post_id != null) {
          return Number(claimedReq.rows[0].post_id);
        }

        return null;
      }
    }

    const postRes = await query(
      `INSERT INTO posts (user_id, type, title, status, zone_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, 'gps-photo', title || null, status, zoneId]
    );

    if ((postRes.rowCount ?? 0) === 0) return null;

    const postId = Number(postRes.rows[0].id);

    await query(
      `INSERT INTO post_content (post_id, content_id, sort)
       VALUES ($1, $2, $3)`,
      [postId, contentId, 0]
    );

    if (tagId) {
      await query(
        `INSERT INTO post_tags (post_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (post_id) DO UPDATE SET tag_id = EXCLUDED.tag_id`,
        [postId, tagId]
      );
    }

    if (idempotencyKey) {
      await query(
        `UPDATE post_submit_requests
         SET post_id = $3
         WHERE user_id = $1 AND request_id = $2 AND post_id IS NULL`,
        [userId, idempotencyKey, postId]
      );
    }

    await eventBus.publish('post', status, {
      postId,
      postType: 'gps-photo',
      postTitle: title || '',
      authorId: userId,
      authorAlias: userAlias,
      zoneId,
      zoneSlug,
    } as PostCreatedEvent);

    return postId;
  } catch (err) {
    await logerror('createMobilePost error', [err]);
    return null;
  }
}
