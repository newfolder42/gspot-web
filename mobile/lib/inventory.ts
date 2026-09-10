import { apiClient } from '@/lib/api';
import { INVENTORY_PAGE_SIZE, type InventoryPageType, type InventoryQuery } from '@/types/item';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  SERVER_ERROR: 'სერვერის შეცდომა. სცადე მოგვიანებით.',
};

function toUserFacingError(err: unknown): Error {
  const body = (err as any)?.response?.data as ApiErrorBody | undefined;
  if (body?.error) {
    return new Error(ERROR_MESSAGES[body.error] ?? body.error);
  }
  return new Error('ქსელური შეცდომა. შეამოწმე ინტერნეტი.');
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toUserFacingError(err);
  }
}

export const inventoryApi = {
  /** One page of the bag, newest first. The name filter is applied server-side. */
  getPage: (options: InventoryQuery = {}): Promise<InventoryPageType> =>
    call(() =>
      apiClient
        .get<InventoryPageType>('/inventory', {
          params: {
            page: options.page ?? 1,
            pageSize: options.pageSize ?? INVENTORY_PAGE_SIZE,
            ...(options.name ? { name: options.name } : {}),
          },
        })
        .then((r) => r.data)
    ),
};
