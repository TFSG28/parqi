import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import ThemeToggle from "@/components/feature/ThemeToggle";
import { ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Applies the persisted/system theme before first paint to avoid a flash of the
// wrong theme. Runs before React hydration; ThemeContext syncs state afterwards.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Template",
  description: "Next.js + Express.js Template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <div className="fixed right-4 top-4 z-50">
              <ThemeToggle />
            </div>
            <ToastContainer
              position="bottom-center"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick={false}
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              transition={Bounce}
            />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

