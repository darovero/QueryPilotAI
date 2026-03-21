import "./globals.css";
import { AuthProvider } from "../providers/AuthProvider";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

const uiFont = Manrope({ subsets: ["latin"], variable: "--font-ui" });
const displayFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "InsightForge AI",
  description: "Governed analytics engineering agent for fraud"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${uiFont.variable} ${displayFont.variable} h-full font-sans`}>
        <AuthProvider>
          <Toaster theme="dark" position="top-center" richColors />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
