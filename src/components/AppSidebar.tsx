import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, FileText, Users, Settings, Kanban, 
  Building2, Tags, Home
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Cotações", url: "/cotacoes", icon: FileText },
  { title: "Funil", url: "/funil", icon: Kanban },
  { title: "Clientes", url: "/clientes", icon: Users },
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
  const isMobile = useIsMobile();

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground";

  const canAccessAdmin = user?.papel === 'Administrador' || user?.papel === 'Gerente';

  // Render menu item with optional tooltip for collapsed state
  const renderMenuItem = (item: any) => {
    const menuButton = (
      <SidebarMenuButton asChild>
        <NavLink to={item.url} end={item.url === "/"} className={getNavCls}>
          <item.icon className="h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {menuButton}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuButton;
  };

  return (
    <TooltipProvider>
      <Sidebar 
        className={`transition-all duration-200 ${collapsed ? "w-[72px]" : "w-[280px]"}`} 
        collapsible="icon"
      >
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderMenuItem(item)}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reports */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Análise</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {reportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderMenuItem(item)}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {canAccessAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Administração</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {renderMenuItem(item)}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}