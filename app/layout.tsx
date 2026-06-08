import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Checkout SaaS — Custom Checkout for Your Store",
  description:
    "Premium checkout experience for Shopify merchants. Faster checkout, higher conversions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
