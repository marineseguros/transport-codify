import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, KeyRound, User, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, session, logout } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  // Formatar último acesso
  const lastSignIn = session?.user?.last_sign_in_at 
    ? format(new Date(session.user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "Não disponível";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 md:h-16 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-3 md:px-6 sticky top-0 z-40">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <SidebarTrigger className="flex-shrink-0" />
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-sm md:text-lg font-semibold text-primary truncate">
                  Sistema de Cotações {user?.modulo || 'Transportes'}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  Gestão de Cotações de {user?.modulo || 'Transportes'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <ThemeToggle />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 md:gap-3 h-auto py-1.5 md:py-2 px-2 md:px-3">
                    <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10">
                      <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                    </div>
                    <div className="text-left hidden md:block">
                      <p className="text-sm font-medium">{user?.nome}</p>
                      <p className="text-xs text-muted-foreground">{user?.papel}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-2">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Último acesso</p>
                        <p>{lastSignIn}</p>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <ChangePasswordModal 
              isOpen={isChangePasswordOpen} 
              onClose={() => setIsChangePasswordOpen(false)} 
            />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 md:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};