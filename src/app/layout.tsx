import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Provider } from "@/components/hoc/provider";
import { cn } from "@/lib/utils";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Gintory",
  description: "Platform manajemen gudang aksesoris gimang",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", outfit.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
