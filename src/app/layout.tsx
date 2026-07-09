import type { Metadata, Viewport } from "next";
import { Archivo, Anton } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
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
  themeColor: "#0B1226",
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
    <html
      lang="es"
      className={`${archivo.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="text-label min-h-full">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
