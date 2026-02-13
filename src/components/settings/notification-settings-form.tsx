"use client";

import { useState } from "react";
import { updateEmailNotifications } from "@/actions/settings";
import Switch from "@/components/common/switch";

type Props = {
  initialEmailEnabled: boolean;
};

export default function NotificationSettingsForm({ initialEmailEnabled }: Props) {
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string | null } | null>(null);

  async function handleToggle() {
    setMessage(null);
    setLoading(true);

    try {
      const newValue = !emailEnabled;
      const result = await updateEmailNotifications(newValue);

      if (result.success) {
        setEmailEnabled(newValue);
        setMessage({ type: 'success', text: result.message });

        // Clear success message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch {
      setMessage({ type: 'error', text: "პარამეტრების განახლებისას მოხდა შეცდომა" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="flex items-start justify-between gap-2">
        <Switch
          checked={emailEnabled}
          onCheckedChange={handleToggle}
          disabled={loading}
          aria-label="Toggle email notifications"
        />
        <div className="flex-1">
          <div className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            იმეილით შეტყობინებები
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            12 საათის წაუკთხავი შეტყობინებები მოგივა მეილზე
          </p>
        </div>
      </div>

      {message && message.type === 'error' && (
        <div className={`text-sm font-medium ${message.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
