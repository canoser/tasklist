import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StructuredData from "@/shared/ui/StructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "DersMatris | Eğitimin Yeni Algoritması",
    template: "%s | DersMatris",
  },
  description: "Yeni Maarif Modeline uygun, İTÜ vizyonlu analitik fizik ve matematik eğitim kampı.",
  openGraph: {
    title: "DersMatris | Akıllı Eğitim Planlama",
    description: "Yapay zeka destekli yeni nesil eğitim planlama platformu.",
    url: "https://dersmatris.com",
    siteName: "DersMatris",
    locale: "tr_TR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <StructuredData />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white m-0 p-0 overflow-hidden">
        <main className="flex-1 w-full h-screen flex items-center justify-center">
          {children}
        </main>
      </body>
    </html>
  );
}
