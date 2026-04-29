import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadNotifications } from "@/actions/notifications";
import NotificationsList from "@/components/notifications/notifications-list";
import type { Metadata } from "next";
import { APP_NAME } from "@/types/constants";

export const metadata: Metadata = {
  title: `შეტყობინებები | ${APP_NAME}`,
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const initialNotifications = await loadNotifications(user.userId, 20);

  return <NotificationsList userId={user.userId} initialNotifications={initialNotifications} />;
}
