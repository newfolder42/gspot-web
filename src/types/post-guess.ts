export type PostGuessType = {
    id: number;
    postId: number;
    userId: number;
    author: string;
    type: string;
    createdAt: string;
    score: number | null;
    distance: number | null;
};

export type PostGuessMapPointType = {
    author: string;
    score: number | null;
    distance: number | null;
    coordinates: { latitude: number; longitude: number };
};

export type PostGuessMapDataType = {
    guessPoints: PostGuessMapPointType[];
    photoCoordinates: { latitude: number; longitude: number } | null;
};