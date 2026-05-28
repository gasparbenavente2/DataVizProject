import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const telenor = localFont({
  src: [
    { path: "../fonts/TelenorEvolution-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/TelenorEvolution-Normal.otf", weight: "400", style: "normal" },
    { path: "../fonts/TelenorEvolution-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/TelenorEvolution-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/TelenorEvolution-ExtraBoldSlanted.otf", weight: "800", style: "italic" },
  ],
  variable: "--font-telenor",
});

export const metadata: Metadata = {
  title: "Perspectiva — News Sentiment Globe",
  description: "How the world's media covers the Russia–Ukraine war, powered by GDELT data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${telenor.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
