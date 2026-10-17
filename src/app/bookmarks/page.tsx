import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getPostBookmarks } from "@/lib/bookmarks";
import BookmarksList from "@/components/bookmarks/bookmarks-list";
import { POST_BOOKMARKS_PAGE_SIZE } from "@/types/bookmark";
import type { Metadata } from "next";
import { APP_NAME } from "@/types/constants";

export const metadata: Metadata = {
  title: `ჩამახსოვრებულები | ${APP_NAME}`,
  description: 'პოსტები, რომლებიც მოგვიანებით გამოსაცნობად ჩაიმახსოვრე',
};

export default async function BookmarksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const initial = await getPostBookmarks(user.userId, POST_BOOKMARKS_PAGE_SIZE);

  return <BookmarksList initial={initial} />;
}
