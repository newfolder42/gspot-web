export type ReportTargetType = 'post' | 'comment' | 'user';

export type ReportReason =
  | 'child_safety'
  | 'nudity_sexual_content'
  | 'harassment_threats'
  | 'violence'
  | 'spam'
  | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  child_safety: 'არასრულწლოვნის უსაფრთხოება',
  nudity_sexual_content: 'შიშველი ან სექსუალური კონტენტი',
  harassment_threats: 'შეურაცხყოფა ან მუქარა',
  violence: 'ძალადობა',
  spam: 'სპამი',
  other: 'სხვა',
};
