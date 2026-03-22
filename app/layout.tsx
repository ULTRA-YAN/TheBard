import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WriteCheck — Grammar, Style & Readability Editor",
  description:
    "A personal writing analysis tool. Paste an article, get inline highlighted errors with feedback across grammar, syntax, mechanics, punctuation, and style.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
