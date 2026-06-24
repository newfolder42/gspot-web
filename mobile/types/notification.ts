export type NotificationType = {
  id: string;
  type:
    | 'gps-guess'
    | 'gps-photo-guess'
    | 'connection-created-gps-post'
    | 'connection-created-quest-post'
    | 'gps-post-failed'
    | 'user-started-following'
    | 'user-achievement-achieved'
    | 'post-comment-created'
    | 'zone-member-invitation'
    | 'zone-quest-objective-submitted'
    | 'zone-quest-objective-accepted'
    | 'zone-quest-objective-rejected'
    | 'zone-quest-completed'
    | 'connection-completed-zone-quest';
  user: {
    userId: number;
    alias: string;
  };
  details:
    | NotificationGpsGuessDetailsType
    | NotificationConnectionPublishedGpsPostDetailsType
    | NotificationConnectionCreatedQuestPostDetailsType
    | NotificationGpsPostPublishFailedDetailsType
    | NotificationUserStartedFollowingDetailsType
    | NotificationUserAchievementAchievedDetailsType
    | NotificationPostCommentCreatedDetailsType
    | NotificationZoneMemberInvitationDetailsType
    | NotificationZoneQuestObjectiveSubmittedDetailsType
    | NotificationZoneQuestObjectiveAcceptedDetailsType
    | NotificationZoneQuestObjectiveRejectedDetailsType
    | NotificationZoneQuestCompletedDetailsType
    | NotificationConnectionCompletedZoneQuestDetailsType;
  timestamp: string | null;
  seen: boolean;
};

export type NotificationGpsGuessDetailsType = {
  postId: number;
  userId: number;
  userAlias: string;
  score: number;
};

export type NotificationConnectionPublishedGpsPostDetailsType = {
  postId: number;
  authorId: number;
  authorAlias: string;
  postType: string;
  title: string;
};

export type NotificationConnectionCreatedQuestPostDetailsType = {
  postId: number;
  authorId: number;
  authorAlias: string;
  postType: string;
  title: string;
};

export type NotificationGpsPostPublishFailedDetailsType = {
  postId: number;
  userId: number;
  userAlias: string;
  postType: string;
  title: string;
  reason: string;
};

export type NotificationUserStartedFollowingDetailsType = {
  id: number;
  followerId: number;
  followerAlias: string;
};

export type NotificationUserAchievementAchievedDetailsType = {
  userId: number;
  achievementKey: string;
  achievementName: string;
  achievementType: 'one_time' | 'progressive';
  milestoneKey?: string;
  milestoneName?: string;
  achievedAt: string | null;
  currentValue?: number;
};

export type NotificationPostCommentCreatedDetailsType = {
  postId: number;
  commentId: number;
  parent?: {
    id: number;
    commenterId: number;
    commenterAlias: string;
  } | null;
  commenterId: number;
  commenterAlias: string;
  commentType: 'comment' | 'gps-guess-comment' | 'gps-photo-guess-comment';
};

export type NotificationZoneMemberInvitationDetailsType = {
  zoneSlug: number;
  userAlias: number;
};

export type NotificationZoneQuestObjectiveSubmittedDetailsType = {
  zoneSlug: string;
  questId: number;
  questTitle: string;
  objectiveId: number;
  objectiveTitle?: string | null;
  submitterAlias: string;
};

export type NotificationZoneQuestObjectiveAcceptedDetailsType = {
  zoneSlug: string;
  questId: number;
  objectiveId: number;
  objectiveTitle?: string | null;
};

export type NotificationZoneQuestObjectiveRejectedDetailsType = {
  zoneSlug: string;
  questId: number;
  objectiveId: number;
  objectiveTitle?: string | null;
  rejectionReason?: string | null;
};

export type NotificationZoneQuestCompletedDetailsType = {
  zoneSlug: string;
  questId: number;
  questTitle: string;
};

export type NotificationConnectionCompletedZoneQuestDetailsType = {
  userId: number;
  userAlias: string;
  zoneId: number;
  zoneSlug: string;
  questId: number;
  questTitle: string;
};

export function getNotificationContentMessage(type: NotificationType['type'], details: NotificationType['details']): string {
  switch (type) {
    case 'gps-guess': {
      const d = details as NotificationGpsGuessDetailsType;
      return `${d.userAlias}-მა შენს პოსტზე სცადა გამოცნობა (${d.score} ქულა)`;
    }
    case 'gps-photo-guess': {
      const d = details as NotificationGpsGuessDetailsType;
      return `${d.userAlias}-მა შენს პოსტზე სცადა გამოცნობა ადგილზე ფოტოს გადაღებით (${d.score} ქულა)`;
    }
    case 'connection-created-gps-post': {
      const d = details as NotificationConnectionPublishedGpsPostDetailsType;
      const title = d.title?.trim();
      return title ? `${d.authorAlias}-მა გამოაქვეყნა: ${title}` : `${d.authorAlias}-მა გამოაქვეყნა ახალი პოსტი`;
    }
    case 'connection-created-quest-post': {
      const d = details as NotificationConnectionCreatedQuestPostDetailsType;
      return `${d.authorAlias}-მა შეასრულა მისია: ${d.title}`;
    }
    case 'gps-post-failed': {
      const d = details as NotificationGpsPostPublishFailedDetailsType;
      const title = d.title?.trim();
      return title ? `შენს პოსტი "${title}" ვერ განთავსდა (${d.reason})` : `შენს პოსტი ვერ განთავსდა (${d.reason})`;
    }
    case 'user-started-following': {
      const d = details as NotificationUserStartedFollowingDetailsType;
      return `ახალი ფოლოვერი ${d.followerAlias}`;
    }
    case 'user-achievement-achieved': {
      const d = details as NotificationUserAchievementAchievedDetailsType;
      if (d.achievementType === 'progressive') return `ახალი მიღწევა: ${d.milestoneName}`;
      if (d.achievementType === 'one_time') return `ახალი მიღწევა: ${d.achievementName}`;
      return 'ახალი მიღწევა';
    }
    case 'post-comment-created': {
      const d = details as NotificationPostCommentCreatedDetailsType;
      return d.parent ? `${d.commenterAlias}-მა დაგიტოვა კომენტარი` : `${d.commenterAlias}-მა დატოვა კომენტარი პოსტზე`;
    }
    case 'zone-member-invitation': {
      const d = details as NotificationZoneMemberInvitationDetailsType;
      return `${d.userAlias}-მა მოგიწვია საბზონაში: ${d.zoneSlug}`;
    }
    case 'zone-quest-objective-submitted': {
      const d = details as NotificationZoneQuestObjectiveSubmittedDetailsType;
      return `${d.submitterAlias}-მა გამოაგზავნა "${d.objectiveTitle ?? ''}" შესაფასებლად`;
    }
    case 'zone-quest-objective-accepted': {
      const d = details as NotificationZoneQuestObjectiveAcceptedDetailsType;
      return `ამოცანა "${d.objectiveTitle ?? ''}" დადასტურდა`;
    }
    case 'zone-quest-objective-rejected': {
      const d = details as NotificationZoneQuestObjectiveRejectedDetailsType;
      return `ამოცანა "${d.objectiveTitle ?? ''}" დაიწუნა, სცადე თავიდან`;
    }
    case 'zone-quest-completed': {
      const d = details as NotificationZoneQuestCompletedDetailsType;
      return `მისია შესრულებულია: ${d.questTitle}`;
    }
    case 'connection-completed-zone-quest': {
      const d = details as NotificationConnectionCompletedZoneQuestDetailsType;
      return `${d.userAlias}-მა შეასრულა მისია: ${d.questTitle}`;
    }
    default:
      return 'ახალი შეტყობინება';
  }
}

export function getNotificationRoute(notification: NotificationType): string | null {
  switch (notification.type) {
    case 'gps-guess': {
      const d = notification.details as NotificationGpsGuessDetailsType;
      return `/post/${d.postId}`;
    }
    case 'gps-photo-guess': {
      const d = notification.details as NotificationGpsGuessDetailsType;
      return `/post/${d.postId}`;
    }
    case 'connection-created-gps-post': {
      const d = notification.details as NotificationConnectionPublishedGpsPostDetailsType;
      return `/post/${d.postId}`;
    }
    case 'connection-created-quest-post': {
      const d = notification.details as NotificationConnectionCreatedQuestPostDetailsType;
      return `/post/${d.postId}`;
    }
    case 'gps-post-failed': {
      const d = notification.details as NotificationGpsPostPublishFailedDetailsType;
      return `/post/${d.postId}`;
    }
    case 'user-started-following': {
      const d = notification.details as NotificationUserStartedFollowingDetailsType;
      return `/account/${d.followerAlias}`;
    }
    case 'user-achievement-achieved': {
      return `/account/${notification.user.alias}/achievements`;
    }
    case 'post-comment-created': {
      const d = notification.details as NotificationPostCommentCreatedDetailsType;
      return `/post/${d.postId}?commentId=${d.commentId}`;
    }
    case 'zone-member-invitation': {
      const d = notification.details as NotificationZoneMemberInvitationDetailsType;
      return `/zone/${d.zoneSlug}`;
    }
    case 'zone-quest-objective-submitted': {
      const d = notification.details as NotificationZoneQuestObjectiveSubmittedDetailsType;
      return `/zone/${d.zoneSlug}/quests/${d.questId}`;
    }
    case 'zone-quest-objective-accepted': {
      const d = notification.details as NotificationZoneQuestObjectiveAcceptedDetailsType;
      return `/zone/${d.zoneSlug}/quests/${d.questId}`;
    }
    case 'zone-quest-objective-rejected': {
      const d = notification.details as NotificationZoneQuestObjectiveRejectedDetailsType;
      return `/zone/${d.zoneSlug}/quests/${d.questId}`;
    }
    case 'zone-quest-completed': {
      const d = notification.details as NotificationZoneQuestCompletedDetailsType;
      return `/zone/${d.zoneSlug}/quests/${d.questId}`;
    }
    case 'connection-completed-zone-quest': {
      const d = notification.details as NotificationConnectionCompletedZoneQuestDetailsType;
      return `/zone/${d.zoneSlug}/quests/${d.questId}`;
    }
    default:
      return null;
  }
}
