import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "InsightForge AI",
  description: "Governed analytics engineering agent for fraud"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
