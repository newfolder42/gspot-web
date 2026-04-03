import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getNotificationSettings } from "@/actions/settings";
import NotificationSettingsForm from "@/components/settings/notification-settings-form";
import type { Metadata } from "next";
import { APP_NAME } from "@/types/constants";

export const metadata: Metadata = {
  title: `პარამეტრები | ${APP_NAME}`,
  description: 'ანგარიშის პარამეტრები და უსაფრთხოება',
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const notificationSettings = await getNotificationSettings();

  return (
    <div className="max-w-4xl mx-auto px-2 py-2 md:py-4">
      <div className="space-y-4">
        {/* {<div className="bg-white dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">უსაფრთხოება</h2>
          </div>
          <div className="p-4">
            <PasswordChangeForm />
          </div>
        </div>} */}

        <div className="overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">შეტყობინებები</h2>
          </div>
          <div className="p-4">
            <NotificationSettingsForm
              initialEmailEnabled={notificationSettings?.emailNotificationsEnabled ?? true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
