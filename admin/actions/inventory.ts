'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { query, withTransaction } from '@/lib/db';
import { publicUrl, putNewObject } from '@/lib/s3';
import {
  ACTIVE_STATUSES,
  GRANT_MODES,
  ITEM_QUALITIES,
  SHAPE_TYPES,
} from '@/lib/labels';
import { inGeorgia, OUTSIDE_GEORGIA_ERROR, parsePolygonJson } from '@/lib/location-json';
import type { ActionState } from '@/types/action';

// Create-only, no auth: the admin runs on the owner's machine. Every action takes the
// (previous state, form data) pair useActionState hands it and returns a Georgian message
// on failure, which the form prints.

const GENERIC_ERROR = 'შეცდომა მოხდა. სცადე თავიდან.';
const ALIAS_EXISTS_ERROR = 'ასეთი alias უკვე არსებობს';

const ICON_FOLDER = 'items';
const ICON_MAX_BYTES = 2 * 1024 * 1024;
const ICON_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const DONE: ActionState = { ok: true, error: null };

function fail(error: string): ActionState {
  return { ok: false, error };
}

// A unique violation only gets a specific message when it is the constraint the form can
// explain (a taken alias, an item already on the location). Any other one — a primary key
// colliding with a hand-inserted row that left the id sequence behind — says "try again",
// which is the right advice: the failed attempt moves the sequence on.
function dbFailure(err: unknown, uniqueMessages: Record<string, string> = {}): ActionState {
  const { code, constraint } = err as { code?: string; constraint?: string };
  if (code === '23505' && constraint && uniqueMessages[constraint]) return fail(uniqueMessages[constraint]);
  console.error(err);
  return fail(GENERIC_ERROR);
}

type SerialTable =
  | 'item_categories'
  | 'item_types'
  | 'items'
  | 'item_locations'
  | 'item_location_groups'
  | 'item_location_items';

// A row inserted with an explicit id (a dump, a hand-written INSERT) leaves the table's serial
// behind it, and the next create collides with that row on its primary key. Move the
// sequence up to the table's highest id and try once more instead of failing until enough
// attempts have walked past the gap. An insert that spans several tables (a location and its
// group) names all of them: a failed statement aborts its transaction, so the retry has to
// rerun the whole thing, and any one of the sequences may be the one that is behind.
async function withSequenceRepair<T>(
  tables: SerialTable | SerialTable[],
  insert: () => Promise<T>
): Promise<T> {
  try {
    return await insert();
  } catch (err) {
    const { code, constraint } = err as { code?: string; constraint?: string };
    if (code !== '23505' || !constraint?.endsWith('_pkey')) throw err;

    for (const table of Array.isArray(tables) ? tables : [tables]) {
      await query(
        `select setval(pg_get_serial_sequence($1, 'id'), (select coalesce(max(id), 1) from ${table}))`,
        [table]
      );
    }
    return insert();
  }
}

// Pages read each other's tables (types feed the item form, items feed the loot form), so a
// create refreshes the whole tree instead of guessing which paths are affected.
function refresh() {
  revalidatePath('/', 'layout');
}

const aliasField = z
  .string()
  .trim()
  .min(1, 'Alias სავალდებულოა')
  .max(50, 'Alias მაქსიმუმ 50 სიმბოლოა')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Alias: მხოლოდ პატარა ლათინური ასოები, ციფრები და ტირე');

const nameField = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'სახელი სავალდებულოა')
    .max(max, `სახელი მაქსიმუმ ${max} სიმბოლოა`);

// Form fields arrive as strings, and an untouched number input is ''.
const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const requiredInt = (message: string) =>
  z.preprocess(emptyToUndefined, z.coerce.number({ error: message }).int(message));

const optionalInt = z.preprocess(emptyToUndefined, z.coerce.number().int().optional());

const sortOrderField = z.preprocess(
  (v) => emptyToUndefined(v) ?? 10,
  z.coerce.number({ error: 'რიგი უნდა იყოს მთელი რიცხვი' }).int('რიგი უნდა იყოს მთელი რიცხვი')
);

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? GENERIC_ERROR;
}

// ---------------------------------------------------------------------------------------
// Categories and types

const categorySchema = z.object({
  alias: aliasField,
  name: nameField(100),
  sortOrder: sortOrderField,
});

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));

  const { alias, name, sortOrder } = parsed.data;
  try {
    await withSequenceRepair('item_categories', () =>
      query(`insert into item_categories (alias, name, sort_order) values ($1, $2, $3)`, [alias, name, sortOrder])
    );
  } catch (err) {
    return dbFailure(err, { item_categories_alias_key: ALIAS_EXISTS_ERROR });
  }

  refresh();
  return DONE;
}

const typeSchema = z.object({
  alias: aliasField,
  name: nameField(100),
  categoryId: requiredInt('აირჩიე კატეგორია'),
});

export async function createType(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = typeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));

  const { alias, name, categoryId } = parsed.data;
  try {
    await withSequenceRepair('item_types', () =>
      query(`insert into item_types (alias, name, category_id) values ($1, $2, $3)`, [alias, name, categoryId])
    );
  } catch (err) {
    return dbFailure(err, { item_types_alias_key: ALIAS_EXISTS_ERROR });
  }

  refresh();
  return DONE;
}

// ---------------------------------------------------------------------------------------
// Items

const itemSchema = z.object({
  alias: aliasField,
  name: nameField(100),
  description: z
    .string()
    .trim()
    .max(1000, 'აღწერა მაქსიმუმ 1000 სიმბოლოა')
    .transform((v) => v || null),
  quality: z.enum(ITEM_QUALITIES, { error: 'აირჩიე ხარისხი' }),
  typeId: optionalInt,
  stackable: z.preprocess((v) => v === 'on', z.boolean()),
  status: z.enum(ACTIVE_STATUSES, { error: 'აირჩიე სტატუსი' }),
  sortOrder: sortOrderField,
});

// The icon keeps the name it was uploaded with (church-candle.png), tidied to lower-case
// latin, so the object in the bucket is recognisable. The extension comes from the checked
// MIME type, not from whatever the file was called.
function iconKey(file: File, alias: string): string {
  const stem = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${ICON_FOLDER}/${stem || alias}.${ICON_EXTENSIONS[file.type]}`;
}

class IconExistsError extends Error {}

export async function createItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const item = parsed.data;

  const upload = formData.get('icon');
  const icon = upload instanceof File && upload.size > 0 ? upload : null;
  if (icon) {
    if (!(icon.type in ICON_EXTENSIONS)) return fail('სურათი უნდა იყოს PNG, JPG, WEBP ან SVG');
    if (icon.size > ICON_MAX_BYTES) return fail('სურათი მაქსიმუმ 2 MB უნდა იყოს');
  }

  const key = icon ? iconKey(icon, item.alias) : null;

  // The row is inserted first and committed only after the upload succeeds: a rejected
  // alias never leaves a file behind, and a failed upload never leaves an item without
  // the icon it was created with.
  const insertItem = () =>
    withTransaction(async (client) => {
      await client.query(
        `insert into items (alias, name, description, icon_url, quality, type_id, stackable, status, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          item.alias,
          item.name,
          item.description,
          key ? publicUrl(key) : null,
          item.quality,
          item.typeId ?? null,
          item.stackable,
          item.status,
          item.sortOrder,
        ]
      );

      if (icon && key) {
        const stored = await putNewObject(key, Buffer.from(await icon.arrayBuffer()), icon.type);
        if (!stored) throw new IconExistsError();
      }
    });

  try {
    await withSequenceRepair('items', insertItem);
  } catch (err) {
    if (err instanceof IconExistsError) {
      return fail('ამ სახელით სურათი უკვე არსებობს, გადაარქვი ფაილს სახელი');
    }
    return dbFailure(err, { items_alias_key: ALIAS_EXISTS_ERROR });
  }

  refresh();
  return DONE;
}

// ---------------------------------------------------------------------------------------
// Item locations, their groups and the groups' items
//
// A location is only a shape. The loot belongs to a group, and a location hands out the loot of
// every active group it is a member of — so one location can sit in several groups (its own
// items plus the items it shares with its neighbours) and one group can span many locations.

const locationBaseSchema = z.object({
  name: nameField(120),
  status: z.enum(ACTIVE_STATUSES, { error: 'აირჩიე სტატუსი' }),
  shapeType: z.enum(SHAPE_TYPES, { error: 'აირჩიე ფორმა' }),
});

const circleSchema = z.object({
  latitude: z.coerce.number({ error: 'განედი არასწორია' }),
  longitude: z.coerce.number({ error: 'გრძედი არასწორია' }),
  radiusM: z.coerce
    .number({ error: 'რადიუსი არასწორია' })
    .int('რადიუსი უნდა იყოს მთელი რიცხვი')
    .min(1, 'რადიუსი უნდა იყოს 1 მეტრზე მეტი'),
});

const idList = (message: string) =>
  z.array(z.coerce.number({ error: message }).int(message).positive(message));

/** Every value of a repeated form field (<select multiple>), blanks dropped, duplicates merged. */
function formIds(formData: FormData, name: string): unknown[] {
  return [...new Set(formData.getAll(name).filter((v) => v !== ''))];
}

const INSERT_POLYGON_LOCATION = `insert into item_locations (name, shape_type, polygon, status)
  values ($1, 'polygon', $2::jsonb, $3) returning id`;
const INSERT_CIRCLE_LOCATION = `insert into item_locations (name, shape_type, latitude, longitude, radius_m, status)
  values ($1, 'circle', $2, $3, $4, $5) returning id`;

export async function createLocation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = Object.fromEntries(formData);
  const base = locationBaseSchema.safeParse(fields);
  if (!base.success) return fail(firstError(base.error));
  const { name, status, shapeType } = base.data;

  let statement: { text: string; params: unknown[] };

  if (shapeType === 'polygon') {
    const raw = String(fields.polygon ?? '').trim();
    if (!raw) return fail('ჩასვი მრავალკუთხედის JSON');

    const parsed = parsePolygonJson(raw);
    if (parsed.error !== undefined) return fail(parsed.error);

    // JSON.stringify gives the single-line form; the trigger derives the bounding box.
    statement = { text: INSERT_POLYGON_LOCATION, params: [name, JSON.stringify(parsed.ring), status] };
  } else {
    const circle = circleSchema.safeParse(fields);
    if (!circle.success) return fail(firstError(circle.error));
    if (!inGeorgia(circle.data.longitude, circle.data.latitude)) return fail(OUTSIDE_GEORGIA_ERROR);

    statement = {
      text: INSERT_CIRCLE_LOCATION,
      params: [name, circle.data.latitude, circle.data.longitude, circle.data.radiusM, status],
    };
  }

  // A location in no group would be saved and then never give anything, with nothing on
  // screen to say why — so it has to start in at least one.
  const ownGroup = formData.get('ownGroup') === 'on';
  const picked = idList('აირჩიე სწორი ჯგუფი').safeParse(formIds(formData, 'groupIds'));
  if (!picked.success) return fail(firstError(picked.error));
  if (!ownGroup && picked.data.length === 0) {
    return fail('აირჩიე ჯგუფი ან დატოვე ჩართული საკუთარი ჯგუფის შექმნა');
  }

  try {
    // One transaction: the location, its own group (if asked) and the memberships appear
    // together or not at all.
    await withSequenceRepair(['item_locations', 'item_location_groups'], () =>
      withTransaction(async (client) => {
        const location = await client.query<{ id: number }>(statement.text, statement.params);
        const locationId = location.rows[0].id;

        const memberOf = [...picked.data];
        if (ownGroup) {
          const group = await client.query<{ id: number }>(
            `insert into item_location_groups (name, status) values ($1, $2) returning id`,
            [name, status]
          );
          memberOf.push(group.rows[0].id);
        }

        await client.query(
          `insert into item_location_group_members (group_id, location_id)
           select g, $1 from unnest($2::int[]) as g
           on conflict do nothing`,
          [locationId, memberOf]
        );
      })
    );
  } catch (err) {
    // includes 23503: a picked group was removed from the database in the meantime
    return dbFailure(err);
  }

  refresh();
  return DONE;
}

const groupSchema = z.object({
  name: nameField(120),
  status: z.enum(ACTIVE_STATUSES, { error: 'აირჩიე სტატუსი' }),
});

export async function createLocationGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));

  const { name, status } = parsed.data;
  try {
    await withSequenceRepair('item_location_groups', () =>
      query(`insert into item_location_groups (name, status) values ($1, $2)`, [name, status])
    );
  } catch (err) {
    return dbFailure(err);
  }

  refresh();
  return DONE;
}

const membershipSchema = z.object({
  groupId: requiredInt('აირჩიე ჯგუფი'),
  locationIds: idList('აირჩიე ლოკაცია').min(1, 'აირჩიე ლოკაცია'),
});

/** Puts one or more locations into a group. Already-members are skipped, not an error. */
export async function addLocationsToGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = membershipSchema.safeParse({
    groupId: formData.get('groupId'),
    locationIds: formIds(formData, 'locationIds'),
  });
  if (!parsed.success) return fail(firstError(parsed.error));

  const { groupId, locationIds } = parsed.data;
  try {
    await query(
      `insert into item_location_group_members (group_id, location_id)
       select $1, l from unnest($2::int[]) as l
       on conflict do nothing`,
      [groupId, locationIds]
    );
  } catch (err) {
    return dbFailure(err);
  }

  refresh();
  return DONE;
}

/** Takes a location out of a group. The group, its loot and the location itself stay. */
export async function removeLocationFromGroup(locationId: number, groupId: number): Promise<ActionState> {
  if (!Number.isInteger(locationId) || !Number.isInteger(groupId)) return fail(GENERIC_ERROR);

  try {
    await query(`delete from item_location_group_members where group_id = $1 and location_id = $2`, [
      groupId,
      locationId,
    ]);
  } catch (err) {
    return dbFailure(err);
  }

  refresh();
  return DONE;
}

const locationItemSchema = z
  .object({
    groupId: requiredInt('აირჩიე ჯგუფი'),
    itemId: requiredInt('აირჩიე ნივთი'),
    grantMode: z.enum(GRANT_MODES, { error: 'აირჩიე რეჟიმი' }),
    probabilityPercent: optionalInt,
    sortOrder: sortOrderField,
  })
  .superRefine((value, ctx) => {
    // mandatory rows carry no chance, probability rows need one from 1 to 100 — the same
    // rule as the table's check constraint, said in words before the database says it in code.
    if (value.grantMode === 'probability') {
      const p = value.probabilityPercent;
      if (p === undefined || p < 1 || p > 100) {
        ctx.addIssue({ code: 'custom', message: 'ალბათობა უნდა იყოს 1-დან 100-მდე' });
      }
    }
  });

export async function createLocationItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = locationItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));

  const { groupId, itemId, grantMode, probabilityPercent, sortOrder } = parsed.data;
  try {
    await withSequenceRepair('item_location_items', () =>
      query(
        `insert into item_location_items (group_id, item_id, grant_mode, probability_percent, sort_order)
         values ($1, $2, $3, $4, $5)`,
        [groupId, itemId, grantMode, grantMode === 'probability' ? probabilityPercent : null, sortOrder]
      )
    );
  } catch (err) {
    return dbFailure(err, { item_location_items_group_item_unique: 'ეს ნივთი ამ ჯგუფში უკვე დამატებულია' });
  }

  refresh();
  return DONE;
}
