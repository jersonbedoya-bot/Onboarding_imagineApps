import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Imagine Apps — Onboarding",
  description: "Plataforma de onboarding operativo de Imagine Apps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
