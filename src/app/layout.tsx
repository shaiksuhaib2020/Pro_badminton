import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EzyFee",
  description: "Fee management for coaching academies",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-so-bg text-so-text antialiased min-h-full flex flex-col">{children}</body>
    </html>
  );
}
