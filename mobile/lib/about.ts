import { apiClient } from '@/lib/api';

export type AboutEntry = { title: string; desc: string };
export type RoadmapEntry = { title: string; status: string; note: string };
export type ChangelogEntry = { version: string; date: string; items: string[] };

export type AboutResponse = {
  appName: string;
  features: AboutEntry[];
  roadmap: RoadmapEntry[];
  technologies: string[];
  changelog: ChangelogEntry[];
};

export const aboutApi = {
  get: (): Promise<AboutResponse> =>
    apiClient.get<AboutResponse>('/about').then((r) => r.data),
};
