import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";

import { ConfirmProvider } from "@/lib/confirm";
import NotificationListener from "@/components/NotificationListener";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SIVCA Admin",
  description: "Portal administrativo de Gestión",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        <ToastProvider>
          <ConfirmProvider>
            <NotificationListener />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
