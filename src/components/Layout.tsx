import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContent = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = state === "collapsed";

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
            <img 
              src="/marine-logo.png" 
              alt="Marine Seguros Logo" 
              className="h-8 w-auto"
            />
            <div>
              <h1 className="text-lg font-semibold text-primary">Sistema de Cotações TRN</h1>
              <p className="text-sm text-muted-foreground">Gestão de Cotações de Transportes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium">{user?.nome}</p>
              <p className="text-xs text-muted-foreground">{user?.papel}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};