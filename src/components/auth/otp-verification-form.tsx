"use client";

import React, { useState, useRef, useEffect } from "react";
import { verifyOTP, resendOTP } from "@/lib/otp";
import { completePendingRegistration } from "@/lib/auth";

interface OTPVerificationFormProps {
  email: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export default function OTPVerificationForm({ email, onSuccess, onBack }: OTPVerificationFormProps) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((digit) => digit !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (!/^\d{6}$/.test(pastedData)) return;

    const newCode = pastedData.split("");
    setCode(newCode);
    inputRefs.current[5]?.focus();

    handleVerify(pastedData);
  };

  const handleVerify = async (codeToVerify?: string) => {
    const otpCode = codeToVerify || code.join("");

    if (otpCode.length !== 6) {
      setError("გთხოვ შეიყვანე 6-ნიშნა კოდი");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyOTP(email, otpCode);

      if (result.success) {
        const completeResult = await completePendingRegistration(email);
        if (completeResult.success) {
          onSuccess?.();
        } else {
          setError('ახალი ანგარიშის შექმნამ ხელი შეუშალა');
        }
      } else {
        const errorMessages: Record<string, string> = {
          INVALID_CODE: 'არასწორი კოდი',
          EXPIRED: 'კოდი ფადაგასული',
          NOT_FOUND: 'კოდი ფერ მოიძებნა',
          ALREADY_VERIFIED: 'მეილი უკვე დადასტურებული',
          SERVER_ERROR: 'სერვერის შეცდომა',
        };
        setError(errorMessages[result.error || ''] || "დაფიქსირდა შეცდომა");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("დაფიქსირდა შეცდომა. გთხოვ ხელახლა სცადე.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await resendOTP(email);

      if (result.success) {
        setResendCooldown(60);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(result.error || "კოდის გაგზავნა ვერ მოხერხდა");
      }
    } catch {
      setError("დაფიქსირდა შეცდომა. გთხოვ ხელახლა სცადო.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          მეილის დადასტურება
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          გთხოვ შეიყვანე 6-ნიშნა კოდი რომელიც გამოგზავნილია მისამართზე:
        </p>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
          {email}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={loading}
            className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg 
                     bg-white dark:bg-zinc-800 
                     border-zinc-300 dark:border-zinc-800 
                     text-zinc-900 dark:text-zinc-50
                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => handleVerify()}
          disabled={loading || code.some((d) => !d)}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 
                   text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {loading ? "მუშავდება..." : "დადასტურება"}
        </button>

        <button
          onClick={handleResend}
          disabled={loading || resendCooldown > 0}
          className="w-full py-2 px-4 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 
                   text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors 
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0
            ? `კოდის ხელახალი გაგზავნა (${resendCooldown}წმ)`
            : "კოდის ხელახალი გაგზავნა"}
        </button>

        {onBack && (
          <button
            onClick={onBack}
            disabled={loading}
            className="w-full py-2 px-4 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 
                     transition-colors disabled:cursor-not-allowed"
          >
            ← უკან დაბრუნება
          </button>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
          💡 კოდი მოქმედებს 10 წუთის განმავლობაში
        </p>
      </div>
    </div>
  );
}
