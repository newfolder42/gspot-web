import { getPostForView, postIsGuessedByUser } from '@/lib/posts';
import PostDetailClient from '@/components/post-detail-client';
import Modal from '@/components/common/modal';
import { getCurrentUser } from '@/lib/session';
import { getZoneTags } from '@/lib/tags';
import { getVoteSummary } from '@/lib/votes';
import { getRewardSummary } from '@/lib/rewards';
import { loadPostCommentsAction } from '@/actions/comments';

type Props = { params: Promise<{ id: number }> };

export default async function PostModal({ params }: Props) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);

  const post = await getPostForView(currentUser?.userId || 0, id);
  if (!post) return null;

  const [alreadyGuessed, comments, zoneTags, postVotes, postRewards] = await Promise.all([
    currentUser ? postIsGuessedByUser(id, currentUser.userId) : Promise.resolve(false),
    loadPostCommentsAction(post.id),
    getZoneTags(post.zoneId),
    getVoteSummary(post.id, null, currentUser?.userId ?? null),
    getRewardSummary(post.id, null, currentUser?.userId ?? null),
  ]);

  return (
    <Modal>
      <PostDetailClient
        post={post}
        comments={comments}
        currentUser={currentUser?.alias || ''}
        alreadyGuessed={alreadyGuessed}
        zoneTags={zoneTags}
        postVotes={postVotes}
        postRewards={postRewards}
      />
    </Modal>
  );
}
