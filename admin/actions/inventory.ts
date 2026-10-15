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

type SerialTable = 'item_categories' | 'item_types' | 'items' | 'item_locations' | 'item_location_items';

// A row inserted with an explicit id (a dump, a hand-written INSERT) leaves the table's serial
// behind it, and the next create collides with that row on its primary key. Move the
// sequence up to the table's highest id and try once more instead of failing until enough
// attempts have walked past the gap.
async function withSequenceRepair<T>(table: SerialTable, insert: () => Promise<T>): Promise<T> {
  try {
    return await insert();
  } catch (err) {
    const { code, constraint } = err as { code?: string; constraint?: string };
    if (code !== '23505' || !constraint?.endsWith('_pkey')) throw err;

    await query(
      `select setval(pg_get_serial_sequence($1, 'id'), (select coalesce(max(id), 1) from ${table}))`,
      [table]
    );
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
// Item locations and their items

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
    statement = {
      text: `insert into item_locations (name, shape_type, polygon, status) values ($1, 'polygon', $2::jsonb, $3)`,
      params: [name, JSON.stringify(parsed.ring), status],
    };
  } else {
    const circle = circleSchema.safeParse(fields);
    if (!circle.success) return fail(firstError(circle.error));
    if (!inGeorgia(circle.data.longitude, circle.data.latitude)) return fail(OUTSIDE_GEORGIA_ERROR);

    statement = {
      text: `insert into item_locations (name, shape_type, latitude, longitude, radius_m, status)
             values ($1, 'circle', $2, $3, $4, $5)`,
      params: [name, circle.data.latitude, circle.data.longitude, circle.data.radiusM, status],
    };
  }

  try {
    await withSequenceRepair('item_locations', () => query(statement.text, statement.params));
  } catch (err) {
    return dbFailure(err);
  }

  refresh();
  return DONE;
}

const locationItemSchema = z
  .object({
    locationId: requiredInt('აირჩიე ლოკაცია'),
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

  const { locationId, itemId, grantMode, probabilityPercent, sortOrder } = parsed.data;
  try {
    await withSequenceRepair('item_location_items', () =>
      query(
        `insert into item_location_items (location_id, item_id, grant_mode, probability_percent, sort_order)
         values ($1, $2, $3, $4, $5)`,
        [locationId, itemId, grantMode, grantMode === 'probability' ? probabilityPercent : null, sortOrder]
      )
    );
  } catch (err) {
    return dbFailure(err, { item_location_items_unique: 'ეს ნივთი ამ ლოკაციაზე უკვე დამატებულია' });
  }

  refresh();
  return DONE;
}
