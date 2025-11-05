import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, FileText, Users, Settings, Kanban, 
  Building2, Tags, Home, Package, ClipboardList
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
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
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const reportItems = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const canAccessAdmin = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
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
                        "flex w-full items-center gap-2 rounded-lg p-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-white font-semibold"
                          : "text-gray-400 bg-transparent hover:bg-primary/30 dark:hover:bg-white/10 hover:text-white"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
                        "flex w-full items-center gap-2 rounded-lg p-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-white font-semibold"
                          : "text-gray-400 bg-transparent hover:bg-primary/30 dark:hover:bg-white/10 hover:text-white"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
                          "flex w-full items-center gap-2 rounded-lg p-2 text-sm transition-colors",
                          isActive
                            ? "bg-primary text-white font-semibold"
                            : "text-gray-400 bg-transparent hover:bg-primary/30 dark:hover:bg-white/10 hover:text-white"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}