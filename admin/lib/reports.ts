import { query } from '@/lib/db';

export type ReportRow = {
  id: number;
  created_at: Date;
  reporter_user_id: number;
  reporter_alias: string;
  target_type: string;
  target_id: number;
  // what the target is, resolved per target_type so the row reads without a lookup
  target_label: string | null;
  // the post to open for a post or comment target
  target_post_id: number | null;
  reason: string;
  details: string | null;
  status: string;
  resolved_at: Date | null;
};

const REPORT_LIMIT = 500;

/**
 * User reports against posts, comments and users, newest first. This is the `reports` table
 * only — post location disputes are a separate flow and are not listed here.
 */
export async function getReports(): Promise<ReportRow[]> {
  const res = await query<ReportRow>(
    `select r.id, r.created_at, r.reporter_user_id, u.alias as reporter_alias,
            r.target_type, r.target_id,
            case r.target_type
              when 'post' then p.title
              when 'comment' then left(c.body, 120)
              when 'user' then tu.alias
            end as target_label,
            case r.target_type when 'post' then r.target_id when 'comment' then c.post_id end as target_post_id,
            r.reason, r.details, r.status, r.resolved_at
     from reports r
     join users u on u.id = r.reporter_user_id
     left join posts p on r.target_type = 'post' and p.id = r.target_id
     left join post_comments c on r.target_type = 'comment' and c.id = r.target_id
     left join users tu on r.target_type = 'user' and tu.id = r.target_id
     order by r.created_at desc, r.id desc
     limit ${REPORT_LIMIT}`
  );
  return res.rows;
}
