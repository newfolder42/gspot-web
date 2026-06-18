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
