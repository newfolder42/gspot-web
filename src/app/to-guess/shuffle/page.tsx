import { redirect } from "next/navigation";
import ShuffleClient from "@/components/shuffle/shuffle-client";
import { getCurrentUser } from "@/lib/session";
import type { Metadata } from "next";
import { APP_NAME } from "@/types/constants";

export const metadata: Metadata = {
  title: `არეულად გამოსაცნობები | ${APP_NAME}`,
  description: 'არეულად და შერჩევითად გამოსაცნობი პოსტების ნახვა',
};

export default async function ShuffleGuessPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return <ShuffleClient />;
}
