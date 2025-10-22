import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/LoginForm";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Cotacoes from "./pages/Cotacoes";
import Clientes from "./pages/Clientes";
import Tarefas from "./pages/Tarefas";
import Usuarios from "./pages/Usuarios";
import Produtores from "./pages/Produtores";
import Seguradoras from "./pages/Seguradoras";
import Ramos from "./pages/Ramos";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import NotFoundPage from "./pages/NotFoundPage";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Sempre permitir acesso à página de reset de senha
  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      {user ? (
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cotacoes" element={<Cotacoes />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/produtores" element={<Produtores />} />
              <Route path="/seguradoras" element={<Seguradoras />} />
              <Route path="/ramos" element={<Ramos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        } />
      ) : (
        <Route path="*" element={<LoginForm />} />
      )}
    </Routes>
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
