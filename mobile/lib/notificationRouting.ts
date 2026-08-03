import { Linking } from 'react-native';
import type { useRouter } from 'expo-router';
import { getNotificationRoute, type NotificationType } from '@/types/notification';

type Router = ReturnType<typeof useRouter>;

const WEB_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://gspot.ge';

/**
 * Opens a web-style route (as produced by getNotificationRoute) on the closest
 * matching native screen, falling back to the website when the app has no
 * equivalent.
 */
export async function openNotificationRoute(route: string | null, router: Router): Promise<void> {
  if (!route) return;

  const [path, search = ''] = route.split('?');
  const segments = path.split('/').filter(Boolean);
  const commentId = search.match(/(?:^|&)commentId=([^&]+)/)?.[1];

  // /post/:id[?commentId=]
  if (segments[0] === 'post' && segments[1]) {
    router.push({
      pathname: '/(app)/post/[id]',
      params: commentId ? { id: segments[1], commentId } : { id: segments[1] },
    });
    return;
  }

  // /zone/:slug/quests/:questId
  if (segments[0] === 'zone' && segments[1] && segments[2] === 'quests' && segments[3]) {
    router.push({
      pathname: '/(app)/zone/[slug]/quests/[questId]',
      params: { slug: segments[1], questId: segments[3] },
    });
    return;
  }

  // /zone/:slug
  if (segments[0] === 'zone' && segments[1] && segments.length === 2) {
    router.push({ pathname: '/(app)/zone/[slug]', params: { slug: segments[1] } });
    return;
  }

  // /account/:alias[/achievements] — the app has one profile screen per user
  if (segments[0] === 'account' && segments[1]) {
    router.push({ pathname: '/(app)/user/[alias]', params: { alias: segments[1] } });
    return;
  }

  await Linking.openURL(`${WEB_BASE_URL.replace(/\/$/, '')}${route}`);
}

/**
 * Routes a tapped push notification. The server flattens payloads as
 * `{ type, ...details }` (see web src/lib/push.ts), so the shape
 * getNotificationRoute expects has to be rebuilt first.
 */
export async function openPushNotification(data: unknown, router: Router): Promise<void> {
  const payload = data as ({ type?: string } & Record<string, unknown>) | null;
  if (!payload?.type) return;

  // This route needs the recipient's alias, which the flattened payload does
  // not carry — but an achievement always belongs to the user tapping it.
  if (payload.type === 'user-achievement-achieved') {
    router.push('/(app)/(tabs)/account');
    return;
  }

  const { type, ...details } = payload;
  await openNotificationRoute(
    getNotificationRoute({ type, details } as unknown as NotificationType),
    router
  );
}
