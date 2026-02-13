"use client";

import { useState } from "react";
import { updatePassword } from "@/actions/settings";

export default function PasswordChangeForm() {
  const inputClasses = "mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: "გთხოვ შეავსე ყველა ველი" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: "ახალი პაროლები არ ემთხვევა" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო" });
      return;
    }

    setLoading(true);
    try {
      const result = await updatePassword(currentPassword, newPassword);

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch {
      setMessage({ type: 'error', text: "დაფიქსირდა გაურკვეველი ხარვეზი" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">მიმდინარე პაროლი</label>
        <div className="relative mt-1">
          <input
            className={inputClasses}
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="მიმდინარე პაროლი"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
            aria-label={showCurrent ? "დამალე პაროლი" : "აჩვენე პაროლი"}
          >
            {showCurrent ? "დამალე" : "ნახვა"}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">ახალი პაროლი</label>
        <div className="relative mt-1">
          <input
            className={inputClasses}
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="მინიმუმ 6 სიმბოლო"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
            aria-label={showNew ? "დამალე პაროლი" : "აჩვენე პაროლი"}
          >
            {showNew ? "დამალე" : "ნახვა"}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">გაიმეორე ახალი პაროლი</label>
        <div className="relative mt-1">
          <input
            className={inputClasses}
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="გაიმეორე ახალი პაროლი"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
            aria-label={showConfirm ? "დამალე პაროლი" : "აჩვენე პაროლი"}
          >
            {showConfirm ? "დამალე" : "ნახვა"}
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
      >
        {loading ? "მიმდინარეობს..." : "პაროლის შეცვლა"}
      </button>
    </form>
  );
}
