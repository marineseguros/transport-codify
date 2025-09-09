import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/LoginForm";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Cotacoes from "./pages/Cotacoes";
import Funil from "./pages/Funil";
import NotFoundPage from "./pages/NotFoundPage";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cotacoes" element={<Cotacoes />} />
        <Route path="/funil" element={<Funil />} />
        <Route path="/clientes" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="/tarefas" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="/usuarios" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="/produtores" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="/seguradoras" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="/ramos" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="/configuracoes" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="/relatorios" element={<div className="p-8 text-center text-muted-foreground">Página em desenvolvimento</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
