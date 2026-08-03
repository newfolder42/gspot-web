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

export type GuessResult = {
  guess: PostGuessType;
  photoCoordinates: { latitude: number; longitude: number };
};

/** Photo ("ადგილზე") guess — the server scores it, so no photo location is revealed. */
export type PhotoGuessResult = {
  guess: PostGuessType;
  distance: number;
  score: number;
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
