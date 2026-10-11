import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ProvedorTema } from "@/components/maquina/tema";
import { Shell } from "@/components/maquina/shell";
import { FundoManchas, ProvedorMovimento } from "@/components/maquina/fundo";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "Máquina de Estáticos", description: "Modelagem de anúncios estáticos" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ProvedorTema><ProvedorMovimento><FundoManchas /><TooltipProvider><Shell>{children}</Shell><Toaster /></TooltipProvider></ProvedorMovimento></ProvedorTema>
      </body>
    </html>
  );
}
