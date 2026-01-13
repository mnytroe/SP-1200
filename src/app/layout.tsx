import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-mu SP-1200",
  description: "SP-1200 Sampling Percussion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
