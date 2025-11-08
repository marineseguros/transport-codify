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
          <header className="h-16 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <img 
                src="/marine-logo.png" 
                alt="Marine Seguros Logo" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-lg font-semibold text-primary">
                  Sistema de Cotações {user?.modulo || 'Transportes'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestão de Cotações de {user?.modulo || 'Transportes'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 h-auto py-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
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
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};