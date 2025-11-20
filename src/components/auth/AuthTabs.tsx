"use client";
import { useState } from "react";
import SignInForm from "./signin-form";
import SignUpForm from "./signup-form";

export default function AuthTabs() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mt-8">
      <div className="flex mb-4 border-b border-zinc-200 dark:border-zinc-700">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === "signin" ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600" : "text-zinc-500"}`}
          onClick={() => setTab("signin")}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === "signup" ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600" : "text-zinc-500"}`}
          onClick={() => setTab("signup")}
        >
          Sign Up
        </button>
      </div>
      <div>
        {tab === "signin" ? <SignInForm /> : <SignUpForm />}
      </div>
    </div>
  );
}
