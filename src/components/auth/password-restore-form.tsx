"use client"

import React, { useState, useEffect, useRef } from "react";
import { initiatePasswordReset, resetPassword } from "@/lib/auth";
import { verifyOTP } from "@/lib/otp";
import { useRouter } from "next/navigation";

export default function PasswordRestoreForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<"invalid" | "mismatch" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (!password) {
      setPasswordStatus(null);
      return;
    }

    if (password.length < 6) {
      setPasswordStatus("invalid");
    } else if (confirmPassword && password !== confirmPassword) {
      setPasswordStatus("mismatch");
    } else {
      setPasswordStatus(null);
    }
  }, [password, confirmPassword]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("გთხოვ შეიყვანე მეილი.");
      return;
    }

    setLoading(true);
    try {
      const result = await initiatePasswordReset(email);

      if (result.success) {
        setStep("otp");
        setResendCooldown(60);
      } else {
        const errorMessages: Record<string, string> = {
          INVALID_EMAIL: 'არასწორი მეილის ფორმატი',
          USER_NOT_FOUND: 'მომხმარებელი ამ მეილით ვერ მოიძებნა',
          EMAIL_SEND_FAILED: 'მეილის გაგზავნა ვერ მოხერხდა',
          SERVER_ERROR: 'სერვერის შეცდომა',
        };
        setError(errorMessages[result.error || ''] || "დაფიქსირდა შეცდომა");
      }
    } catch (err) {
      setError("დაფიქსირდა შეცდომა. გთხოვ ხელახლა სცადე.");
    } finally {
      setLoading(false);
    }
  }

  const handleOTPChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((digit) => digit !== "")) {
      handleOTPVerify(newCode.join(""));
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (!/^\d{6}$/.test(pastedData)) return;

    const newCode = pastedData.split("");
    setCode(newCode);
    inputRefs.current[5]?.focus();

    handleOTPVerify(pastedData);
  };

  const handleOTPVerify = async (codeToVerify?: string) => {
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
        setStep("password");
      } else {
        const errorMessages: Record<string, string> = {
          INVALID_CODE: 'არასწორი კოდი',
          EXPIRED: 'კოდის ვადა გასულია',
          NOT_FOUND: 'კოდი ვერ მოიძებნა',
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

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await initiatePasswordReset(email);

      if (result.success) {
        setResendCooldown(60);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError("კოდის გაგზავნა ვერ მოხერხდა");
      }
    } catch {
      setError("დაფიქსირდა შეცდომა. გთხოვ ხელახლა სცადე.");
    } finally {
      setLoading(false);
    }
  };

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("გთხოვ შეავსე ყველა ველი.");
      return;
    }

    if (passwordStatus === "invalid") {
      setError("პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.");
      return;
    }

    if (passwordStatus === "mismatch") {
      setError("პაროლები არ ემთხვევა.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email, password);

      if (result.success) {
        router.push("/auth/signin?reset=success");
      } else {
        const errorMessages: Record<string, string> = {
          INVALID_PASSWORD: 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო',
          USER_NOT_FOUND: 'მომხმარებელი ვერ მოიძებნა',
          SERVER_ERROR: 'სერვერის შეცდომა',
        };
        setError(errorMessages[result.error || ''] || "დაფიქსირდა შეცდომა");
      }
    } catch (err) {
      setError("დაფიქსირდა შეცდომა. გთხოვ ხელახლა სცადე.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="overflow-hidden">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              მეილის დადასტურება
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              გთხოვ შეიყვანე 6-ნიშნა კოდი რომელიც გამოგზავნილია მისამართზე:
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mt-1 mb-6">
              {email}
            </p>

            <div className="flex justify-center gap-2 mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                  onPaste={index === 0 ? handleOTPPaste : undefined}
                  disabled={loading}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg 
                           bg-white dark:bg-zinc-800 
                           border-zinc-300 dark:border-zinc-700 
                           text-zinc-900 dark:text-zinc-50
                           focus:border-[#00c8ff] focus:ring-2 focus:ring-[#00c8ff]/20
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
                onClick={() => handleOTPVerify()}
                disabled={loading || code.some((d) => !d)}
                className="w-full py-3 px-4 bg-[#00c8ff] hover:bg-[#00b0e6] disabled:bg-zinc-200 dark:disabled:bg-zinc-700 
                         text-black font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {loading ? "მუშავდება..." : "დადასტურება"}
              </button>

              <button
                onClick={handleResendOTP}
                disabled={loading || resendCooldown > 0}
                className="w-full py-2 px-4 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 
                         text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `კოდის ხელახალი გაგზავნა (${resendCooldown}წმ)`
                  : "კოდის ხელახალი გაგზავნა"}
              </button>

              <button
                onClick={() => setStep("email")}
                disabled={loading}
                className="w-full py-2 px-4 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                ← უკან
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "password") {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="overflow-hidden">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">ახალი პაროლი</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              შეიყვანე ახალი პაროლი შენი ანგარიშისთვის.
            </p>

            <form onSubmit={handlePasswordSubmit} className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">ახალი პაროლი</label>
                <div className="relative mt-1">
                  <input
                    className="block w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="პაროლი"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    aria-label={showPassword ? "დამალე პაროლი" : "აჩვენე პაროლი"}
                  >
                    {showPassword ? "დამალე" : "ნახვა"}
                  </button>
                </div>
                {passwordStatus === "invalid" && password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">გაიმეორე პაროლი</label>
                <div className="relative mt-1">
                  <input
                    className="block w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="გაიმეორე პაროლი"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    aria-label={showPassword ? "დამალე პაროლი" : "აჩვენე პაროლი"}
                  >
                    {showPassword ? "დამალე" : "ნახვა"}
                  </button>
                </div>
                {passwordStatus === "mismatch" && confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">პაროლები არ ემთხვევა</p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || !!passwordStatus}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
              >
                {loading ? "მიმდინარეობს..." : "პაროლის შეცვლა"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">პაროლის აღდგენა</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            შეიყვანე შენი მეილი და ჩვენ გამოგიგზავნით ვერიფიკაციის კოდს.
          </p>

          <form onSubmit={handleEmailSubmit} className="grid gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">მეილი</label>
              <input
                className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="you@example.com"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
            >
              {loading ? "მიმდინარეობს..." : "გამოგზავნე კოდი"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
