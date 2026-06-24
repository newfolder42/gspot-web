// Usage: node --env-file=.env.local src/seed-tbilisi-quests.js [zoneSlug]
// Inserts one Tbilisi/Georgia themed quest per state the app code branches on:
// active vs archived, not-yet-started vs expired vs open date window, required_level
// gating, and every user_quest/user_quest_objectives progress state (untouched,
// pending_review, rejected, fully completed). All quests use character_id = 1.

const { Pool } = require('pg');

const ZONE_SLUG = process.argv[2] || 'public';
const CHARACTER_ID = 1;

const pool = new Pool({
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: 5432,
  ...(process.env.POSTGRES_SSL !== 'false' && { ssl: { rejectUnauthorized: false } }),
});

function loc(latitude, longitude) {
  return { type: 'in_range_location', latitude, longitude };
}

function photo() {
  return { type: 'capture_photo' };
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

const QUESTS = [
  {
    // baseline: active, ordered, no dates, no level, no progress
    title: 'ნარიყალას ციხის ექსპედიცია',
    description: 'ეწვიე ძველი თბილისის სიმბოლოს - ნარიყალას ციხე-სიმაგრეს - და დააფიქსირე მონახულება.',
    objectiveOrder: 'ordered',
    status: 'active',
    objectives: [
      { title: 'ციხესთან მისვლა', displayText: 'მიხვედი ნარიყალას ციხესთან? დააფიქსირე ლოკაცია.', ...loc(41.6877, 44.8099) },
      { title: 'ხედის გადაღება', displayText: 'გადაიღე ფოტო ციხიდან გადაშლილი ძველი თბილისის ხედით.', ...photo() },
    ],
  },
  {
    // active + currently open date window (start in past, end in future)
    title: 'მშვიდობის ხიდის ბილიკი',
    description: 'გადაკვეთე მტკვარი მინის მშვიდობის ხიდზე და დააფიქსირე ღამის განათება.',
    objectiveOrder: 'ordered',
    status: 'active',
    startDate: daysFromNow(-7),
    endDate: daysFromNow(30),
    objectives: [
      { title: 'ხიდზე გასვლა', displayText: 'ჩადგი მშვიდობის ხიდზე და დააფიქსირე ლოკაცია.', ...loc(41.6905, 44.8076) },
      { title: 'ღამის ფოტო', displayText: 'გადაიღე ფოტო ხიდის განათებასთან ან მტკვრის ხედით.', ...photo() },
    ],
  },
  {
    // active but locked: start_date in the future
    title: 'სამების ტაძრის მონახულება',
    description: 'ეწვიე საქართველოს მთავარ საკათედრო ტაძარს - წმინდა სამებას. (ჯერ არ დაწყებულა)',
    objectiveOrder: 'unordered',
    status: 'active',
    startDate: daysFromNow(14),
    objectives: [
      { displayText: 'მიხვედი სამების საკათედრო ტაძართან? დააფიქსირე ლოკაცია.', ...loc(41.7011, 44.8181) },
    ],
  },
  {
    // active but locked: end_date already passed
    title: 'რუსთაველის გამზირის ექსკურსია',
    description: 'გაიარე ქალაქის მთავარ გამზირზე და დააფიქსირე ერთ-ერთი ისტორიული ფასადი. (ვადა ამოიწურა)',
    objectiveOrder: 'ordered',
    status: 'active',
    endDate: daysFromNow(-3),
    objectives: [
      { title: 'გამზირზე გასვლა', displayText: 'ჩადგი რუსთაველის გამზირზე და დააფიქსირე ლოკაცია.', ...loc(41.6977, 44.798) },
      { title: 'ფასადის ფოტო', displayText: 'გადაიღე ფოტო ერთ-ერთი ისტორიული შენობის ფასადთან.', ...photo() },
    ],
  },
  {
    // active but locked: required_level above a typical caller's level
    title: 'მთაწმინდის სიმაღლეები',
    description: 'ავიდე მთაწმინდაზე ფუნიკულიორით ან ფეხით და დატკბი ქალაქის ხედით. (საჭიროა მინიმუმ 5 დონე)',
    objectiveOrder: 'ordered',
    status: 'active',
    requiredLevel: 5,
    objectives: [
      { title: 'პარკთან მისვლა', displayText: 'მიხვედი მთაწმინდის პარკთან? დააფიქსირე ლოკაცია.', ...loc(41.6953, 44.7805) },
      { title: 'ქალაქის ხედი', displayText: 'გადაიღე ფოტო თბილისის პანორამული ხედით სიმაღლიდან.', ...photo() },
    ],
  },
  {
    // fully completed: user_quest completed + every objective completed & reviewed
    title: 'სიონისა და მეტეხის ორმაგი მარშრუტი',
    description: 'მოიარე ძველი თბილისის ორი ისტორიული წერტილი - სიონის ტაძარი და მეტეხის ხიდი.',
    objectiveOrder: 'unordered',
    status: 'active',
    demoUserQuestStatus: 'completed',
    objectives: [
      { title: 'სიონის ტაძარი', displayText: 'მიხვედი სიონის ტაძართან? დააფიქსირე ლოკაცია.', seedStatus: 'completed', ...loc(41.6907, 44.8068) },
      { title: 'მეტეხის ხიდი', displayText: 'მიხვედი მეტეხის ხიდთან? დააფიქსირე ლოკაცია.', seedStatus: 'completed', ...loc(41.6926, 44.8103) },
    ],
  },
  {
    // in progress: objective submitted and awaiting moderation (pending_review)
    title: 'სამეგობრო პარკში დასვენება',
    description: 'ეწვიე ჭავჭავაძის სამეგობრო პარკს ვაკეში.',
    objectiveOrder: 'unordered',
    status: 'active',
    demoUserQuestStatus: 'active',
    objectives: [
      { displayText: 'მიხვედი სამეგობრო პარკთან? დააფიქსირე ლოკაცია.', seedStatus: 'pending_review', ...loc(41.7079, 44.7649) },
    ],
  },
  {
    // in progress: ordered quest, first objective completed, second still pending
    title: 'გმირთა მოედნიდან ბოტანიკურ ბაღამდე',
    description: 'გაიარე გმირთა მოედნიდან ძველი თბილისის ბოტანიკურ ბაღამდე.',
    objectiveOrder: 'ordered',
    status: 'active',
    demoUserQuestStatus: 'active',
    objectives: [
      { title: 'გმირთა მოედანი', displayText: 'მიხვედი გმირთა მოედანთან? დააფიქსირე ლოკაცია.', seedStatus: 'completed', ...loc(41.71, 44.8009) },
      { title: 'ბოტანიკური ბაღი', displayText: 'მიხვედი ბოტანიკურ ბაღთან? დააფიქსირე ლოკაცია.', seedStatus: 'pending', ...loc(41.6859, 44.8132) },
    ],
  },
  {
    // in progress: first objective rejected by a moderator, second still pending
    title: '"ქართლის დედასთან" ასვლა',
    description: 'ავიდე სოლოლაკის ქედზე და ნახე ქალაქის მთავარი ქანდაკება.',
    objectiveOrder: 'ordered',
    status: 'active',
    demoUserQuestStatus: 'active',
    objectives: [
      { title: 'ქანდაკებამდე ასვლა', displayText: 'მიხვედი "ქართლის დედასთან"? დააფიქსირე ლოკაცია.', seedStatus: 'rejected', ...loc(41.6886, 44.8128) },
      { title: 'ქანდაკების ფოტო', displayText: 'გადაიღე ფოტო ქანდაკების ან მისგან გადაშლილი ხედით.', seedStatus: 'pending', ...photo() },
    ],
  },
  {
    // archived: hidden from the active zone quest feed
    title: 'ძველი ბაზრის გემოები',
    description: 'მოძებნე და დააფიქსირე ორი ტრადიციული ქართული გემო ძველი ქალაქის ბაზრებში. (დაარქივებული)',
    objectiveOrder: 'unordered',
    status: 'archived',
    objectives: [
      { title: 'ხინკალი ან ხაჭაპური', displayText: 'გადაიღე ფოტო ხინკლის ან ხაჭაპურის თეფშთან.', ...photo() },
      { title: 'ჩურჩხელა', displayText: 'გადაიღე ფოტო ჩურჩხელასთან ან საფირმო ცარცის ჯიშის ხილით.', ...photo() },
    ],
  },
  {
    // combo: required_level AND an open date window at the same time
    title: 'აბანოთუბნის გოგირდის წყაროები',
    description: 'ეწვიე აბანოთუბანს, სადაც ძველი თბილისის გოგირდის აბანოები მდებარეობს.',
    objectiveOrder: 'unordered',
    status: 'active',
    requiredLevel: 2,
    startDate: daysFromNow(-1),
    endDate: daysFromNow(10),
    objectives: [
      { displayText: 'მიხვედი აბანოთუბანთან? დააფიქსირე ლოკაცია.', ...loc(41.6885, 44.8115) },
    ],
  },
];

function randomRadius() {
  return Math.round(80 + Math.random() * 120); // 80-200m
}

async function main() {
  const zoneRes = await pool.query('select id from zones where slug = $1', [ZONE_SLUG]);
  if (zoneRes.rows.length === 0) {
    console.error(`Zone "${ZONE_SLUG}" not found`);
    process.exitCode = 1;
    return;
  }
  const zoneId = zoneRes.rows[0].id;

  const memberRes = await pool.query(
    `select user_id from zone_members
     where zone_id = $1 and status = 'active'
     order by case role when 'owner' then 0 when 'admin' then 1 when 'moderator' then 2 else 3 end, joined_at asc
     limit 1`,
    [zoneId]
  );
  const demoUserId = memberRes.rows[0]?.user_id ?? null;
  if (!demoUserId) {
    console.warn('No active zone member found - quests with demo progress will be created without user_quests data.');
  }

  for (const q of QUESTS) {
    const questRes = await pool.query(
      `INSERT INTO zone_quests
         (zone_id, title, description, objective_order, status, character_id, required_level, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [zoneId, q.title, q.description, q.objectiveOrder, q.status, CHARACTER_ID, q.requiredLevel ?? null, q.startDate ?? null, q.endDate ?? null]
    );
    const questId = questRes.rows[0].id;

    const objectiveIds = [];
    for (let i = 0; i < q.objectives.length; i++) {
      const obj = q.objectives[i];
      const config =
        obj.type === 'in_range_location'
          ? { latitude: obj.latitude, longitude: obj.longitude, radiusMeters: randomRadius() }
          : {};

      const objRes = await pool.query(
        `INSERT INTO zone_quest_objectives (quest_id, title, display_text, type, config, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [questId, obj.title ?? null, obj.displayText, obj.type, JSON.stringify(config), i]
      );
      objectiveIds.push(objRes.rows[0].id);
    }

    if (q.demoUserQuestStatus && demoUserId) {
      const uqRes = await pool.query(
        `INSERT INTO user_quests (quest_id, user_id, status, completed_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (quest_id, user_id) DO NOTHING
         RETURNING id`,
        [questId, demoUserId, q.demoUserQuestStatus, q.demoUserQuestStatus === 'completed' ? new Date().toISOString() : null]
      );
      const userQuestId = uqRes.rows[0]?.id;

      if (userQuestId) {
        for (let i = 0; i < q.objectives.length; i++) {
          const seedStatus = q.objectives[i].seedStatus;
          if (!seedStatus || seedStatus === 'pending') continue;

          const reviewed = seedStatus === 'completed' || seedStatus === 'rejected';
          const photoUrl = `https://gspot-uploads-dev.s3.eu-central-1.amazonaws.com/seed/quest-${questId}-objective-${i}.jpg`;

          await pool.query(
            `INSERT INTO user_quest_objectives
               (user_quest_id, objective_id, status, photo_url, capture_data, submitted_at, reviewed_by, reviewed_at, rejection_reason)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8)`,
            [
              userQuestId,
              objectiveIds[i],
              seedStatus,
              photoUrl,
              JSON.stringify({ captureMethod: 'live_gps' }),
              reviewed ? demoUserId : null,
              reviewed ? new Date().toISOString() : null,
              seedStatus === 'rejected' ? 'ფოტო არ ემთხვევა მისიის აღწერას' : null,
            ]
          );
        }
      }
    }

    console.log(`created quest #${questId}: ${q.title} [${q.status}, ${q.objectiveOrder}]`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
