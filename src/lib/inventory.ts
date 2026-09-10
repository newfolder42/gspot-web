// Server-only helpers behind the `/inventory` action and API route. Deliberately not a
// "use server" module: grantItemToUser takes an explicit userId, and a server action would
// let any client mint any item into any account.
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logerror } from '@/lib/logger';
import { INVENTORY_DEFAULT_PAGE_SIZE, normalizeInventoryPageSize } from '@/types/item';
import type {
  FoundItemType,
  InventoryItemType,
  InventoryPageType,
  InventoryQuery,
  ItemDefinition,
  ItemQuality,
  ItemSource,
} from '@/types/item';

function mapItemDefinitionRow(r: any): ItemDefinition {
  return {
    alias: r.alias,
    name: r.name,
    description: r.description ?? null,
    iconUrl: r.icon_url ?? null,
    quality: (r.quality ?? 'common') as ItemQuality,
    type: r.type_alias ? { alias: r.type_alias, name: r.type_name } : null,
    category: r.category_alias ? { alias: r.category_alias, name: r.category_name } : null,
    stackable: Boolean(r.stackable),
  };
}

function mapInventoryRow(r: any): InventoryItemType {
  return {
    ...mapItemDefinitionRow(r),
    acquiredAt: r.created_at,
    source: (r.source ?? 'found') as ItemSource,
    count: Number(r.count ?? 1),
  };
}

const ITEM_COLUMNS = `i.alias, i.name, i.description, i.icon_url, i.quality, i.stackable,
       t.alias as type_alias, t.name as type_name,
       c.alias as category_alias, c.name as category_name`;

// An item's category is reached through its type, so both joins travel together and both
// are left joins — an unfiled item still renders.
const ITEM_JOINS = `left join item_types t on t.id = i.type_id
     left join item_categories c on c.id = t.category_id`;

/**
 * Catalog rows for the given aliases, including disabled ones — a reward tile or an
 * inventory slot must still render an item that has since been retired.
 */
export async function getItemDefinitionsByAliases(aliases: string[]): Promise<ItemDefinition[]> {
  if (aliases.length === 0) return [];
  try {
    const res = await query(
      `select ${ITEM_COLUMNS}
       from items i
       ${ITEM_JOINS}
       where i.alias = any($1::varchar[])
       order by i.sort_order, i.alias`,
      [aliases]
    );
    return res.rows.map(mapItemDefinitionRow);
  } catch (err) {
    await logerror('getItemDefinitionsByAliases error', [err]);
    return [];
  }
}

const EMPTY_PAGE = (page: number, pageSize: number): InventoryPageType => ({
  items: [],
  page,
  pageSize,
  total: 0,
  totalPages: 1,
  totalOwned: 0,
});

// Web entry point — the mobile API calls getInventoryForUser directly.
export async function getInventory(options: InventoryQuery = {}): Promise<InventoryPageType> {
  const user = await getCurrentUser();
  if (!user) return EMPTY_PAGE(1, normalizeInventoryPageSize(options.pageSize));
  return getInventoryForUser(user.userId, options);
}

/**
 * One page of the user's bag, newest first, plus the counts the pager needs. `page` is
 * clamped to the last non-empty page so a stale link never lands on nothing.
 */
export async function getInventoryForUser(
  userId: number,
  options: InventoryQuery = {}
): Promise<InventoryPageType> {
  const pageSize = normalizeInventoryPageSize(options.pageSize, INVENTORY_DEFAULT_PAGE_SIZE);
  const requestedPage = Math.max(1, Math.trunc(Number(options.page) || 1));
  const nameFilter = options.name?.trim() || null;

  try {
    const filters: string[] = [];
    const params: unknown[] = [userId];

    if (nameFilter) {
      params.push(`%${nameFilter}%`);
      filters.push(`i.name ilike $${params.length}`);
    }
    // Every query stays anchored on the owner so it can use the (user_id, created_at) index.
    const where = ['ui.user_id = $1', ...filters].join(' and ');
    const filterOnly = filters.length > 0 ? filters.join(' and ') : 'true';

    // Both counts in one pass: the filtered total drives the pager, the owned total the
    // "N ნივთი" badge that must not move when a filter is applied.
    const countRes = await query(
      `select
         count(*) filter (where ${filterOnly})::int as filtered,
         count(*)::int as owned
       from user_items ui
       join items i on i.id = ui.item_id
       where ui.user_id = $1`,
      params
    );

    const total = Number(countRes.rows[0]?.filtered ?? 0);
    const totalOwned = Number(countRes.rows[0]?.owned ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);

    const pageParams = [...params, pageSize, (page - 1) * pageSize];
    const itemsRes = await query(
      `select ${ITEM_COLUMNS}, ui.created_at, ui.source, ui.count
       from user_items ui
       join items i on i.id = ui.item_id
       ${ITEM_JOINS}
       where ${where}
       order by ui.created_at desc, ui.id desc
       limit $${pageParams.length - 1} offset $${pageParams.length}`,
      pageParams
    );

    return {
      items: itemsRes.rows.map(mapInventoryRow),
      page,
      pageSize,
      total,
      totalPages,
      totalOwned,
    };
  } catch (err) {
    await logerror('getInventoryForUser error', [err]);
    return EMPTY_PAGE(requestedPage, pageSize);
  }
}

/**
 * Puts an item in a user's bag, and returns it with the resulting count when something
 * actually changed — which is what the caller announces ("შენს ინვენტარში მატებაა …").
 *
 * A stackable item bumps its count on every grant, so it always returns. A non-stackable
 * one the user already holds returns null: the grant is a no-op and there is nothing to
 * announce. Disabled catalog rows are never granted.
 */
export async function grantItemToUser(
  userId: number,
  alias: string,
  source: ItemSource = 'found',
  sourceDetails: Record<string, unknown> = {}
): Promise<FoundItemType | null> {
  try {
    const defRes = await query(
      `select i.id, ${ITEM_COLUMNS}
       from items i
       ${ITEM_JOINS}
       where i.alias = $1 and i.status = 'active' limit 1`,
      [alias]
    );
    if ((defRes.rowCount ?? 0) === 0) return null;

    const definition = mapItemDefinitionRow(defRes.rows[0]);
    const itemId = Number(defRes.rows[0].id);

    // The conflict target is (user_id, item_id) either way: a stackable item raises the
    // count on the row the user already has rather than adding a second one, so the bag
    // never shows the same item twice. A unique item that is already held updates nothing
    // and returns no row, which is how the caller learns there is nothing to announce.
    const res = await query(
      definition.stackable
        ? `insert into user_items (user_id, item_id, count, source, source_details)
           values ($1, $2, 1, $3, $4::jsonb)
           on conflict (user_id, item_id) do update set count = user_items.count + 1
           returning count`
        : `insert into user_items (user_id, item_id, count, source, source_details)
           values ($1, $2, 1, $3, $4::jsonb)
           on conflict (user_id, item_id) do nothing
           returning count`,
      [userId, itemId, source, JSON.stringify(sourceDetails)]
    );

    if ((res.rowCount ?? 0) === 0) return null;
    return { ...definition, count: Number(res.rows[0].count ?? 1) };
  } catch (err) {
    await logerror('grantItemToUser error', [err]);
    return null;
  }
}

/**
 * Distinct items held, not the sum of stack counts — the bag counter and the
 * items_collected achievement both count different ნივთები, so five of one stackable
 * item is still one item collected.
 */
export async function getUserItemsCount(userId: number): Promise<number> {
  try {
    const res = await query(
      `select count(*)::int as cnt from user_items where user_id = $1`,
      [userId]
    );
    return Number(res.rows[0]?.cnt ?? 0);
  } catch (err) {
    await logerror('getUserItemsCount error', [err]);
    return 0;
  }
}
