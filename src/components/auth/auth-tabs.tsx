"use client"

import { useState } from "react";
import SignInForm from "./signin-form";
import SignUpForm from "./signup-form";

export default function AuthTabs() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mt-8">
      <div className="flex mb-4 border-b border-zinc-200 dark:border-zinc-700">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === "signin" ? "text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
          onClick={() => setTab("signin")}
        >
          ავტორიზაცია
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === "signup" ? "text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
          onClick={() => setTab("signup")}
        >
          რეგისტრაცია
        </button>
      </div>
      <div>
        {tab === "signin" ? <SignInForm /> : <SignUpForm />}
      </div>
    </div>
  );
}
