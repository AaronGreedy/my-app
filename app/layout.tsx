import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SwRegister } from "@/components/sw-register";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#040404",
};

export const metadata: Metadata = {
  title: "Personal Growth — Aaron",
  description: "Personal Growth App",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Aaron" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <SwRegister/>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
