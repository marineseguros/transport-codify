import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, FileText, Package, Home as HomeIcon,
  BarChart3, Settings, Building2, Tags
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  description: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAccessAdmin = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  const menuItems: MenuItem[] = [
    { 
      title: "Clientes", 
      url: "/clientes", 
      icon: Users,
      description: "Gerencie seus clientes e contatos"
    },
    { 
      title: "Cotações", 
      url: "/cotacoes", 
      icon: FileText,
      description: "Acompanhe e crie cotações"
    },
    { 
      title: "Produtos", 
      url: "/produtos", 
      icon: Package,
      description: "Catálogo de produtos e serviços"
    },
    { 
      title: "Dashboard", 
      url: "/dashboard", 
      icon: HomeIcon,
      description: "Visão geral e métricas"
    },
  ];

  const reportItems: MenuItem[] = [
    { 
      title: "Relatórios", 
      url: "/relatorios", 
      icon: BarChart3,
      description: "Análises e relatórios detalhados"
    },
  ];

  const adminItems: MenuItem[] = [
    { 
      title: "Usuários", 
      url: "/usuarios", 
      icon: Users,
      description: "Gerenciar usuários do sistema"
    },
    { 
      title: "Produtores", 
      url: "/produtores", 
      icon: Users,
      description: "Gerenciar produtores"
    },
    { 
      title: "Seguradoras", 
      url: "/seguradoras", 
      icon: Building2,
      description: "Cadastro de seguradoras"
    },
    { 
      title: "Ramos", 
      url: "/ramos", 
      icon: Tags,
      description: "Gerenciar ramos de seguros"
    },
    { 
      title: "Configurações", 
      url: "/configuracoes", 
      icon: Settings,
      description: "Configurações do sistema"
    },
  ];

  const handleCardClick = (url: string) => {
    navigate(url);
  };

  const MenuCard = ({ item }: { item: MenuItem }) => {
    const Icon = item.icon;
    return (
      <Card 
        className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-primary"
        onClick={() => handleCardClick(item.url)}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 min-h-[180px]">
          <Icon className="h-12 w-12 mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2 text-center">{item.title}</h3>
          <p className="text-sm text-muted-foreground text-center">{item.description}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Marine Seguros</h1>
          <p className="text-lg text-muted-foreground">Selecione uma área para começar</p>
        </div>

        {/* Principal */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Principal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <MenuCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Análise */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Análise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reportItems.map((item) => (
              <MenuCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Administração */}
        {canAccessAdmin && (
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-foreground">Administração</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminItems.map((item) => (
                <MenuCard key={item.title} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;
