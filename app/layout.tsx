import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk, Bebas_Neue } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LazyMotion, domAnimation } from "motion/react";
import "./globals.css";

const bebas = Bebas_Neue({ weight: "400", variable: "--font-bebas", subsets: ["latin"] });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["300","400","500","600","700"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Media — AI Systems for Web3",
  description: "Community acquisition, drop marketing, and on-chain intelligence for the fastest Web3 projects.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bebas.variable} ${space.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#050507] text-white antialiased" style={{ fontFamily: "var(--font-space)" }}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LazyMotion features={domAnimation}>
            {children}
          </LazyMotion>
        </ThemeProvider>
      </body>
    </html>
  );
}
