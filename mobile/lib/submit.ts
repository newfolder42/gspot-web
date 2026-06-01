import { apiClient } from '@/lib/api';

export type ZoneTag = {
  id: number;
  zone_id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type ZoneSubmitType = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  settings: {
    upload_rules: string[];
  };
  tags: ZoneTag[];
};

type ZonesResponse = {
  zones: ZoneSubmitType[];
};

type UploadUrlResponse = {
  signedUrl: string;
};

type SaveContentResponse = {
  contentId: number;
};

type CreatePostResponse = {
  postId: number;
};

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  ZONE_NOT_ALLOWED: 'ამ საბზონაში ატვირთვის უფლება არ გაქვს.',
  STORE_FAILED: 'ფოტოს შენახვა ვერ მოხერხდა.',
  CREATE_POST_FAILED: 'პოსტის შექმნა ვერ მოხერხდა.',
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

export const submitApi = {
  loadZones: (): Promise<ZoneSubmitType[]> =>
    call(() => apiClient.get<ZonesResponse>('/submit/zones').then((r) => r.data.zones)),

  createUploadUrl: (): Promise<string> =>
    call(() =>
      apiClient
        .post<UploadUrlResponse>('/submit/upload-url', { type: 'gps-photo' })
        .then((r) => r.data.signedUrl)
    ),

  saveContent: (params: {
    publicUrl: string;
    originalFileName: string;
    fileSize: number;
    coordinates: { latitude: number; longitude: number };
    dateTaken: string | null;
  }): Promise<number> =>
    call(() => apiClient.post<SaveContentResponse>('/submit/content', params).then((r) => r.data.contentId)),

  createPost: (params: {
    title: string;
    contentId: number;
    zoneId: number;
    zoneSlug: string;
    idempotencyKey: string;
    tagId: number | null;
  }): Promise<number> =>
    call(() => apiClient.post<CreatePostResponse>('/submit/post', params).then((r) => r.data.postId)),
};
