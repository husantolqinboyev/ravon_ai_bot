import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Pronunciation from "./pages/Pronunciation";
import Profile from "./pages/Profile";
import Premium from "./pages/Premium";
import Statistics from "./pages/Statistics";
import Help from "./pages/Help";
import TextToSpeech from "./pages/TextToSpeech";
import Referral from "./pages/Referral";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft">
          <div className="w-12 h-12 rounded-full bg-primary/20" />
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route - Login */}
          <Route path="/" element={<Index />} />
          
          {/* Protected routes */}
          <Route path="/test" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/pronunciation" element={
            <ProtectedRoute><Pronunciation /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/premium" element={
            <ProtectedRoute><Premium /></ProtectedRoute>
          } />
          <Route path="/stats" element={
            <ProtectedRoute><Statistics /></ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute><Help /></ProtectedRoute>
          } />
          <Route path="/tts" element={
            <ProtectedRoute><TextToSpeech /></ProtectedRoute>
          } />
          <Route path="/referral" element={
            <ProtectedRoute><Referral /></ProtectedRoute>
          } />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
