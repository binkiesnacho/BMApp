import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BMApp — Gestión de Balonmano",
    template: "%s · BMApp",
  },
  description:
    "Gestión de plantillas, partidos y estadísticas in-game de balonmano.",
  applicationName: "BMApp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BMApp",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // respeta safe-area en iPhone con notch
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="bg-canvas text-label min-h-full">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
