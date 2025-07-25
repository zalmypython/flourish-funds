import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "next-themes";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1">
            <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
              <div className="flex items-center justify-between h-full px-6">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant">
                      <span className="text-white font-bold text-sm">F</span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      Flourish Funds
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Welcome back!
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/20">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}