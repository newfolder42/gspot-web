export type PostType = {
  id: number;
  type: string;
  title: string;
  author: string;
  date: string;
};

export type GpsPostType = PostType & {
  image: string;
  dateTaken?: string | null;
}