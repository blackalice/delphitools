import type { Metadata } from "next";
import "./globals.css";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { FavoritesProvider } from "@/components/favorites-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToolSearchProvider } from "@/components/tool-search-provider";
import { THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "pickletools",
  description:
    "A collection of small, low stakes and low effort tools. No logins, no registration, no data collection.",
  icons: {
    icon: "/pickles.jpg",
    shortcut: "/pickles.jpg",
    apple: "/pickles.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-mono antialiased">
        <ThemeProvider>
          <FavoritesProvider>
            <ToolSearchProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <AppHeader />
                  <main className="flex-1 overflow-auto">{children}</main>
                </SidebarInset>
              </SidebarProvider>
            </ToolSearchProvider>
          </FavoritesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
