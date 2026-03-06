import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, FileText, Users, Settings, Kanban, Building2, Tags, Home, Package, ClipboardList, ChevronLeft, ChevronRight, Target, LogOut, KeyRound, User, Clock } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
const menuItems = [{
  title: "Clientes",
  url: "/clientes",
  icon: Users
}, {
  title: "Cotações",
  url: "/cotacoes",
  icon: FileText
}, {
  title: "Acompanhamento",
  url: "/acompanhamento",
  icon: ClipboardList
}, {
  title: "Indicadores",
  url: "/produtos",
  icon: Package
}, {
  title: "Dashboard",
  url: "/",
  icon: Home
}];
const adminItems = [{
  title: "Usuários",
  url: "/usuarios",
  icon: Users
}, {
  title: "Produtores",
  url: "/produtores",
  icon: Users
}, {
  title: "Seguradoras",
  url: "/seguradoras",
  icon: Building2
}, {
  title: "Ramos",
  url: "/ramos",
  icon: Tags
}, {
  title: "Metas",
  url: "/metas",
  icon: Target
}, {
  title: "Configurações",
  url: "/configuracoes",
  icon: Settings
}];
const reportItems = [{
  title: "Relatórios",
  url: "/relatorios",
  icon: BarChart3
}];
export function AppSidebar() {
  const {
    state,
    toggleSidebar
  } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const {
    user,
    session,
    logout
  } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const currentPath = location.pathname;
  const canAccessAdmin = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);
  
  const lastSignIn = session?.user?.last_sign_in_at 
    ? format(new Date(session.user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "Não disponível";
  return <Sidebar className="h-screen" collapsible="icon">
      {/* Logo da Empresa */}
      <SidebarHeader className="border-b px-3 py-4 flex items-center justify-center">
        <img src="/marine-logo.png" alt="Marine Seguros Logo" className={cn("cursor-pointer", collapsed ? "h-10 w-10" : "h-16 w-16")} />
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
              const isActive = currentPath === item.url;
              return <SidebarMenuItem key={item.title}>
                    <NavLink to={item.url} end className={cn("flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium", isActive ? "bg-primary text-white font-semibold" : "text-foreground/70 bg-transparent hover:bg-primary/30 hover:text-primary dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white")} aria-current={isActive ? "page" : undefined}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn("whitespace-nowrap", collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuItem>;
            })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reports */}
        

        {/* Admin Section */}
        {canAccessAdmin && <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map(item => {
              const isActive = currentPath === item.url;
              return <SidebarMenuItem key={item.title}>
                      <NavLink to={item.url} className={cn("flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium", isActive ? "bg-primary text-white font-semibold" : "text-foreground/70 bg-transparent hover:bg-primary/30 hover:text-primary dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white")} aria-current={isActive ? "page" : undefined}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className={cn("whitespace-nowrap", collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
                          {item.title}
                        </span>
                      </NavLink>
                    </SidebarMenuItem>;
            })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>

      {/* User controls at bottom */}
      <SidebarFooter className="border-t px-2 py-3">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
          <ThemeToggle />
          
          {!collapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 flex-shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate">{user?.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.papel}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64">
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
                <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)} className="cursor-pointer">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {collapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-4 w-4 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-64">
                <DropdownMenuLabel>{user?.nome}</DropdownMenuLabel>
                <p className="px-2 pb-2 text-xs text-muted-foreground">{user?.papel}</p>
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
                <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)} className="cursor-pointer">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarFooter>

      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
      
      {/* Botão customizado na linha divisória com chevron */}
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-50">
        <button onClick={toggleSidebar} className="h-6 w-6 rounded-full border bg-background shadow-md flex items-center justify-center hover:bg-accent" aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}>
          {collapsed ? <ChevronRight className="h-4 w-4 text-foreground" /> : <ChevronLeft className="h-4 w-4 text-foreground" />}
        </button>
      </div>
    </Sidebar>;
}