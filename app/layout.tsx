import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Jules Daynos · Membership", description: "Memberships and Head Spa packages at Jules Daynos salons in Portimão and Tavira." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt"><body>{children}</body></html>; }
