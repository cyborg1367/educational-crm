import type { Metadata } from "next";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/feedback";

import "./globals.css";

export const metadata: Metadata = {
  title: "Educational CRM",
  description: "سیستم مدیریت آموزشی",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
