import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/modules/notifications/components/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ConnectSphere - Internet Service Provider",
  description:
    "High-speed internet with flexible plans. Choose a package, pay via mobile money, and get connected instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="antialiased font-sans">
        <TooltipProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
