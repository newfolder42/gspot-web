export type Post = {
    id: number;
    type: string;
    title: string;
    author: string;
    date: string;
};

export type GpsPost = Post & {
    image: string;
}