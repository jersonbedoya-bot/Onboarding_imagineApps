import type { Metadata, Viewport } from "next";
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

// Sin esto, Next.js NO agrega ningún <meta name="viewport"> por default —
// el navegador móvil renderiza como si fuera desktop (~980px de ancho
// virtual) y lo achica para que "quepa", en vez de ajustar el layout real
// al ancho de la pantalla. Es la causa típica de "en el teléfono no se
// ajusta" cuando el resto del CSS ya es responsive (como acá).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
