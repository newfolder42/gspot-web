"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logerror } from '@/lib/logger';
import { sendReportNotificationEmail } from '@/lib/email';
import { REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from '@/types/report';

export async function submitReport(
  targetType: ReportTargetType,
  targetId: number,
  reason: ReportReason,
  details?: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return submitReportForUser(user.userId, user.alias, targetType, targetId, reason, details);
}

// Same as submitReport, by explicit user — shared by the web action and /api/v1.
export async function submitReportForUser(
  userId: number,
  alias: string,
  targetType: ReportTargetType,
  targetId: number,
  reason: ReportReason,
  details?: string
): Promise<boolean> {
  try {
    const res = await query(
      `insert into reports (reporter_user_id, target_type, target_id, reason, details)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [userId, targetType, targetId, reason, details ?? null]
    );
    const reportId = res.rows[0]?.id;

    // Best-effort — a failed notification email shouldn't fail the report itself,
    // the row is already committed and reviewable directly in the DB.
    sendReportNotificationEmail({
      reportId,
      reporterAlias: alias,
      targetType,
      targetId,
      reason: REPORT_REASON_LABELS[reason] ?? reason,
      details,
    }).catch((err) => logerror('sendReportNotificationEmail failed', { error: String(err), reportId }));

    return true;
  } catch (err) {
    await logerror('submitReportForUser error', { error: String(err), userId, targetType, targetId, reason });
    return false;
  }
}
