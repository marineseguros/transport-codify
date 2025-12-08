import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, FileText, Users, Settings, Kanban, 
  Building2, Tags, Home, Package, ClipboardList, ChevronLeft, ChevronRight, Target
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Cotações", url: "/cotacoes", icon: FileText },
  { title: "Acompanhamento", url: "/acompanhamento", icon: ClipboardList },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Dashboard", url: "/", icon: Home },
];

const adminItems = [
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Produtores", url: "/produtores", icon: Users },
  { title: "Seguradoras", url: "/seguradoras", icon: Building2 },
  { title: "Ramos", url: "/ramos", icon: Tags },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const reportItems = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const canAccessAdmin = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  return (
    <Sidebar className={cn(
      collapsed ? "w-14" : "w-64"
    )} collapsible="icon">
      {/* Logo da Empresa */}
      <SidebarHeader className="border-b px-3 py-4 flex items-center justify-center">
        <img 
          src="/marine-logo.png" 
          alt="Marine Seguros Logo" 
          className={cn(
            "cursor-pointer",
            collapsed ? "h-10 w-10" : "h-16 w-16"
          )}
        />
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium",
                        isActive
                          ? "bg-primary text-white font-semibold"
                          : "text-foreground/70 bg-transparent hover:bg-primary/30 hover:text-primary dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn(
                        "whitespace-nowrap",
                        collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                      )}>
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reports */}
        <SidebarGroup>
          <SidebarGroupLabel>Análise</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportItems.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium",
                        isActive
                          ? "bg-primary text-white font-semibold"
                          : "text-foreground/70 bg-transparent hover:bg-primary/30 hover:text-primary dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn(
                        "whitespace-nowrap",
                        collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                      )}>
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {canAccessAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const isActive = currentPath === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium",
                          isActive
                            ? "bg-primary text-white font-semibold"
                            : "text-foreground/70 bg-transparent hover:bg-primary/30 hover:text-primary dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className={cn(
                          "whitespace-nowrap",
                          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                        )}>
                          {item.title}
                        </span>
                      </NavLink>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      {/* Botão customizado na linha divisória com chevron */}
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-50">
        <button
          onClick={toggleSidebar}
          className="h-6 w-6 rounded-full border bg-background shadow-md flex items-center justify-center hover:bg-accent"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-foreground" />
          )}
        </button>
      </div>
    </Sidebar>
  );
}