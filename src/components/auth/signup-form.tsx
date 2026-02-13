"use client"

import React, { useState, useEffect } from "react";
import { signup, userAliasTaken } from "@/lib/auth";
import OTPVerificationForm from "./otp-verification-form";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aliasStatus, setAliasStatus] = useState<"checking" | "available" | "taken" | "invalid" | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<"invalid" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !name || !alias) {
      setError("გთხოვთ შეავსოთ ყველა ველი.");
      return;
    }

    if (aliasStatus !== "available") {
      setError("გთხოვთ აარჩიოთ თავისუფალი თიკუნი.");
      return;
    }

    if (passwordStatus === "invalid") {
      setError("პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.");
      return;
    }

    setLoading(true);
    try {
      await signup({ name, alias, email, password });

      setRegisteredEmail(email);
      setShowOTPVerification(true);
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_EXISTS') {
        setError('მომხმარებელი ამ მეილით ან თიკუნით უკვე არსებობს.');
        return;
      }
      if (err instanceof Error && err.message === 'INVALID_INPUT') {
        setError('არასწორი მონაცემები.');
        return;
      }
      setError("გთხოვთ ხელახლა ცადოთ მოგვიანებით.");
    } finally {
      setLoading(false);
    }
  }

  const handleOTPSuccess = () => {
    router.push("/auth/signin");
  };

  const handleOTPBack = () => {
    setShowOTPVerification(false);
    setName("");
    setAlias("");
    setEmail("");
    setPassword("");
    setAliasStatus(null);
  };

  useEffect(() => {
    if (!alias) {
      setAliasStatus(null);
      return;
    }

    if (alias.length < 3 || alias.length > 30) {
      setAliasStatus("invalid");
      return;
    }

    if (!/^[a-z0-9_-]+$/i.test(alias)) {
      setAliasStatus("invalid");
      return;
    }

    const timer = setTimeout(async () => {
      setAliasStatus("checking");
      try {
        if (!alias || typeof alias !== "string") {
          setAliasStatus("invalid");
          return;
        }

        if (alias.length < 3 || alias.length > 30) {
          setAliasStatus("invalid");
          return;
        }

        if (!/^[a-z0-9_-]+$/i.test(alias)) {
          setAliasStatus("invalid");
          return;
        }
        const taken = await userAliasTaken(alias);
        setAliasStatus(!taken ? "available" : "taken");
      } catch {
        setAliasStatus(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [alias]);

  useEffect(() => {
    if (!password) {
      setPasswordStatus(null);
      return;
    }

    if (password.length < 6) {
      setPasswordStatus("invalid");
    } else {
      setPasswordStatus(null);
    }
  }, [password]);

  if (showOTPVerification && registeredEmail) {
    return (
      <OTPVerificationForm
        email={registeredEmail}
        onSuccess={handleOTPSuccess}
        onBack={handleOTPBack}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">შემოგვი1დი</h2>
          {/* <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Join GSpot — upload photos and let others guess where they were taken.</p> */}

          <div className="mt-6 grid gap-3">

            <form onSubmit={handleSubmit} className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">სახელი</label>
                <input
                  className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="შენი სრული სახელი (არსად გამოჩნდება)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">თიკუნი</label>
                <div className="relative mt-1">
                  <input
                    className="block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                    id="alias"
                    name="alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.toLowerCase())}
                    placeholder="უნიკალური სახელი"
                  />
                  {alias && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {aliasStatus === "checking" && (
                        <div className="inline-block animate-spin h-4 w-4 border-2 border-zinc-400 border-t-zinc-700 rounded-full" />
                      )}
                      {aliasStatus === "available" && (
                        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {aliasStatus === "taken" && (
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      {aliasStatus === "invalid" && (
                        <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                {aliasStatus === "invalid" && alias && (
                  <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">უნდა შედგებოდეს 3-30 სიმბოლოსგან (დასაშვები სიმბოლოები: რიცხვები, ასოები, ქვედატირე)</p>
                )}
                {aliasStatus === "taken" && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">დაკავებულია</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">მეილი</label>
                <input
                  className="mt-1 block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">პაროლი</label>
                <div className="relative mt-1">
                  <input
                    className="block w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
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
                  {password && passwordStatus === "invalid" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {passwordStatus === "invalid" && password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო</p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#00c8ff] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00b0e6] disabled:opacity-60 transition"
              >
                {loading ? "მიმდინარეობს..." : "რეგისტრაცია"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}