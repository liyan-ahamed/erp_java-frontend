import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider, themeInitScript } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";

// Variable font, so Forma's in-between weights (450, 550, 650) render as designed.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Department ERP",
  description: "Department workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The theme script may add `dark` before hydration, hence suppressHydrationWarning.
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <QueryProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </QueryProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
