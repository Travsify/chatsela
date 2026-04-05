import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatSela | Premium WhatsApp Sales Bots",
  description: "Connect your WhatsApp and start making sales automatically with the most advanced bot platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
