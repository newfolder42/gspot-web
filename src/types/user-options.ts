export type NotificationOptions = {
  email: boolean;
  // Future notification options can be added here
  // push?: boolean;
  // sms?: boolean;
};

export type UserOptions = {
  id: number;
  userId: number;
  notifications: NotificationOptions;
  createdAt: string;
  updatedAt: string;
};

// For future expansion - you can add more JSON columns here
// export type PrivacyOptions = {
//   profileVisibility: 'public' | 'private';
//   showEmail: boolean;
// };
