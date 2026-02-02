import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_Georgian } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LeftPanel from "@/components/left-panel";
import { getCurrentUser } from "@/lib/session";

const notoGeorgian = Noto_Serif_Georgian({
  variable: "--font-default",
  subsets: ["georgian"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "G'spot | გამოიცანი სადაა გადაღებული!",
  description:
    "გამოიცანი სადაა გადაღებული ფოტო-სურათები საქართველოდან. გამოავლინე შენი უნარჩვევი საქართველოს გეოგრაფიული ლოკაციების ცონაში. შემოუერთდი gspot.ge-ს!",
  metadataBase: new URL("https://gspot.ge"),
  openGraph: {
    title: "Gspot | გამოიცანი სადაა გადაღებული!",
    description:
      "გამოიცანი სადაა გადაღებული ფოტო-სურათები საქართველოდან. გამოავლინე შენი უნარჩვევი საქართველოს გეოგრაფიული ლოკაციების ცონაში. შემოუერთდი gspot.ge-ს!",
    url: "https://gspot.ge",
    siteName: "G'spot.ge",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "G'spot.ge | გამოიცანი სადაა გადაღებული!",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "G'spot | გამოიცანი სადაა გადაღებული!",
    description:
      "გამოიცანი სადაა გადაღებული ფოტო-სურათები საქართველოდან. გამოავლინე შენი უნარჩვევი საქართველოს გეოგრაფიული ლოკაციების ცონაში. შემოუერთდი gspot.ge-ს!",
    site: "@gspotge",
    images: ["/og-image.png"],
  },
  keywords: [
    "geo guessing",
    "guess the place",
    "location game",
    "photo guessing",
    "upload photo with location",
    "gspot.ge",
    "გამოიცანი სადაა გადაღებული",
    "გეოლოკაციის თამაში",
    "ატვირე სურათი",
    "ჯი'სპოტი",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body
        className={`${notoGeorgian.variable} ${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Header image={{
          url: "/gspot.svg"
        }} headers={[]} user={user} />

        <LeftPanel />

        <main className="flex-1 pt-14 md:pl-56 bg-zinc-950 dark:db-zinc-100">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
