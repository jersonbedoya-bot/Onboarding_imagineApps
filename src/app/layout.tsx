import type { Metadata, Viewport } from "next";
import { TASA_Orbiter, Work_Sans } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// Mismas familias que imagineapps.co: TASA Orbiter en títulos, Work Sans en
// texto. Antes Fraunces (serif) + Inter, que no se parecían al sitio.
const tasaOrbiter = TASA_Orbiter({
  variable: "--font-tasa-orbiter",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  // next/font no tiene métricas de TASA Orbiter (fuente reciente) para
  // calcular un fallback ajustado, y avisaba "Failed to find font override
  // values" en cada compilación. Se desactiva ese ajuste: mientras carga se
  // ve la fuente de sistema de --font-display sin corrección de tamaño.
  adjustFontFallback: false,
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin", "latin-ext"],
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
    <html lang="es" className={`${tasaOrbiter.variable} ${workSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
