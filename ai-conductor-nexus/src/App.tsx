import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { useAppStore } from "./stores/useAppStore";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sandbox from "./pages/Sandbox";
import PresentationPage from "./pages/Presentation";
import MiniGame from "./pages/MiniGame";
import MediaPlayer from "./pages/MediaPlayer";
import SettingsPage from "./pages/Settings";
import AdminPage from "./pages/Admin";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const currentUser = useAppStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && currentUser.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sandbox" element={<Sandbox />} />
            <Route path="/presentation" element={<PresentationPage />} />
            <Route path="/game" element={<MiniGame />} />
            <Route path="/media" element={<MediaPlayer />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/admin" element={<AuthGuard adminOnly><AdminPage /></AuthGuard>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function LoginGuard() {
  const currentUser = useAppStore((s) => s.currentUser);
  if (currentUser) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default App;
