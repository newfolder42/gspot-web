export type HeatmapPointType = {
    latitude: number;
    longitude: number;
    weight: number;
};

export type HeatmapDataType = {
    points: HeatmapPointType[];
    totalPosts: number;
};
