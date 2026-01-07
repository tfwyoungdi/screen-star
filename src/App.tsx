import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CinemaSettings from "./pages/CinemaSettings";
import StaffManagement from "./pages/StaffManagement";
import MovieManagement from "./pages/MovieManagement";
import ScreenManagement from "./pages/ScreenManagement";
import ShowtimeManagement from "./pages/ShowtimeManagement";
import SalesDashboard from "./pages/SalesDashboard";
import TicketScanner from "./pages/TicketScanner";
import PromoCodeManagement from "./pages/PromoCodeManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import PublicCinema from "./pages/PublicCinema";
import BookingFlow from "./pages/BookingFlow";
import CustomerManagement from "./pages/CustomerManagement";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/cinema/:slug" element={<PublicCinema />} />
              <Route path="/cinema/:slug/book" element={<BookingFlow />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/movies"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <MovieManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screens"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <ScreenManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/showtimes"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <ShowtimeManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager', 'accountant']}>
                    <SalesDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scanner"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'gate_staff']}>
                    <TicketScanner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <CinemaSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <StaffManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/promos"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <PromoCodeManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
                    <CustomerManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager', 'accountant']}>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
