import { query } from '@/lib/db';

// Read side of the inventory tables. Writes live in actions/inventory.ts.
// Counts are cast to int in SQL: pg hands bigint back as a string.

export type CategoryRow = {
  id: number;
  alias: string;
  name: string;
  sort_order: number;
  type_count: number;
  created_at: Date;
};

export type TypeRow = {
  id: number;
  alias: string;
  name: string;
  category_id: number;
  category_name: string;
  item_count: number;
  created_at: Date;
};

export type ItemRow = {
  id: number;
  alias: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  quality: string;
  stackable: boolean;
  status: string;
  sort_order: number;
  type_name: string | null;
  category_name: string | null;
  created_at: Date;
};

export type GroupRef = { id: number; name: string; status: string };

export type LocationRow = {
  id: number;
  name: string;
  shape_type: string;
  latitude: number | null;
  longitude: number | null;
  radius_m: number | null;
  polygon: [number, number][] | null;
  status: string;
  found_count: number;
  created_at: Date;
  /** the groups whose loot this location hands out; empty means it gives nothing */
  groups: GroupRef[];
};

export type GroupRow = {
  id: number;
  name: string;
  status: string;
  item_count: number;
  created_at: Date;
  locations: { id: number; name: string; status: string }[];
};

export type LocationItemRow = {
  id: number;
  group_id: number;
  group_name: string;
  item_alias: string;
  item_name: string;
  item_icon_url: string | null;
  item_quality: string;
  grant_mode: string;
  probability_percent: number | null;
  sort_order: number;
  created_at: Date;
};

export async function getCategories(): Promise<CategoryRow[]> {
  const res = await query<CategoryRow>(
    `select c.id, c.alias, c.name, c.sort_order, c.created_at,
            (select count(*)::int from item_types t where t.category_id = c.id) as type_count
     from item_categories c
     order by c.sort_order, c.id`
  );
  return res.rows;
}

export async function getTypes(): Promise<TypeRow[]> {
  const res = await query<TypeRow>(
    `select t.id, t.alias, t.name, t.category_id, c.name as category_name, t.created_at,
            (select count(*)::int from items i where i.type_id = t.id) as item_count
     from item_types t
     join item_categories c on c.id = t.category_id
     order by c.sort_order, c.id, t.name`
  );
  return res.rows;
}

// Newest first, so an item just created is the first row of the grid.
export async function getItems(): Promise<ItemRow[]> {
  const res = await query<ItemRow>(
    `select i.id, i.alias, i.name, i.description, i.icon_url, i.quality, i.stackable,
            i.status, i.sort_order, i.created_at,
            t.name as type_name, c.name as category_name
     from items i
     left join item_types t on t.id = i.type_id
     left join item_categories c on c.id = t.category_id
     order by i.id desc`
  );
  return res.rows;
}

export async function getLocations(): Promise<LocationRow[]> {
  const res = await query<LocationRow>(
    `select l.id, l.name, l.shape_type, l.latitude, l.longitude, l.radius_m, l.polygon,
            l.status, l.found_count, l.created_at,
            coalesce((
              select json_agg(json_build_object('id', g.id, 'name', g.name, 'status', g.status) order by g.id)
              from item_location_group_members m
              join item_location_groups g on g.id = m.group_id
              where m.location_id = l.id
            ), '[]'::json) as groups
     from item_locations l
     order by l.id desc`
  );
  return res.rows;
}

export async function getGroups(): Promise<GroupRow[]> {
  const res = await query<GroupRow>(
    `select g.id, g.name, g.status, g.created_at,
            (select count(*)::int from item_location_items li where li.group_id = g.id) as item_count,
            coalesce((
              select json_agg(json_build_object('id', l.id, 'name', l.name, 'status', l.status) order by l.id)
              from item_location_group_members m
              join item_locations l on l.id = m.location_id
              where m.group_id = g.id
            ), '[]'::json) as locations
     from item_location_groups g
     order by g.id desc`
  );
  return res.rows;
}

// One group's loot in the order the app rolls it (sort_order), or every group's.
export async function getLocationItems(groupId: number | null): Promise<LocationItemRow[]> {
  const res = await query<LocationItemRow>(
    `select li.id, li.group_id, g.name as group_name,
            i.alias as item_alias, i.name as item_name, i.icon_url as item_icon_url, i.quality as item_quality,
            li.grant_mode, li.probability_percent, li.sort_order, li.created_at
     from item_location_items li
     join item_location_groups g on g.id = li.group_id
     join items i on i.id = li.item_id
     where ($1::int is null or li.group_id = $1)
     order by li.group_id desc, li.sort_order, li.id`,
    [groupId]
  );
  return res.rows;
}

/** Options for the "add item to group" form. Disabled items are left out. */
export async function getItemOptions(): Promise<{ id: number; alias: string; name: string }[]> {
  const res = await query<{ id: number; alias: string; name: string }>(
    `select id, alias, name from items where status = 'active' order by name`
  );
  return res.rows;
}

export type UserItemRow = {
  id: number;
  user_id: number;
  user_alias: string;
  item_alias: string;
  item_name: string;
  item_icon_url: string | null;
  item_quality: string;
  count: number;
  source: string;
  source_details: Record<string, unknown>;
  created_at: Date;
};

export const USER_ITEMS_LIMIT = 500;

/** What users hold and where it came from, newest first; optionally one user's. */
export async function getUserItems(userId: number | null): Promise<UserItemRow[]> {
  const res = await query<UserItemRow>(
    `select ui.id::int as id, ui.user_id::int as user_id, u.alias as user_alias,
            i.alias as item_alias, i.name as item_name, i.icon_url as item_icon_url, i.quality as item_quality,
            ui.count, ui.source, ui.source_details, ui.created_at
     from user_items ui
     join users u on u.id = ui.user_id
     join items i on i.id = ui.item_id
     where ($1::bigint is null or ui.user_id = $1)
     order by ui.created_at desc, ui.id desc
     limit ${USER_ITEMS_LIMIT}`,
    [userId]
  );
  return res.rows;
}
