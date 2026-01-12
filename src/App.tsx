import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PlatformProtectedRoute } from "@/components/auth/PlatformProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import CinemaBooking from "./pages/CinemaBooking";
import CustomerManagement from "./pages/CustomerManagement";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ConcessionManagement from "./pages/ConcessionManagement";
import CinemaAbout from "./pages/CinemaAbout";
import CinemaCareers from "./pages/CinemaCareers";
import CinemaContact from "./pages/CinemaContact";
import ContactSubmissions from "./pages/ContactSubmissions";
import JobApplications from "./pages/JobApplications";
import BoxOffice from "./pages/BoxOffice";
import GateStaff from "./pages/GateStaff";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import StaffLogin from "./pages/StaffLogin";
import SupportTickets from "./pages/SupportTickets";
import PlatformAdminLogin from "./pages/PlatformAdminLogin";
import PlatformDashboard from "./pages/platform-admin/PlatformDashboard";
import PlatformCinemas from "./pages/platform-admin/PlatformCinemas";
import PlatformPlans from "./pages/platform-admin/PlatformPlans";
import PlatformTransactions from "./pages/platform-admin/PlatformTransactions";
import PlatformTickets from "./pages/platform-admin/PlatformTickets";
import PlatformSettings from "./pages/platform-admin/PlatformSettings";
import PlatformDomains from "./pages/platform-admin/PlatformDomains";
import PlatformUsers from "./pages/platform-admin/PlatformUsers";
import PlatformMonitoring from "./pages/platform-admin/PlatformMonitoring";
import PlatformReports from "./pages/platform-admin/PlatformReports";
import PlatformAuditLogs from "./pages/platform-admin/PlatformAuditLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/cinema/:slug" element={<PublicCinema />} />
                <Route path="/cinema/:slug/about" element={<CinemaAbout />} />
                <Route path="/cinema/:slug/careers" element={<CinemaCareers />} />
                <Route path="/cinema/:slug/contact" element={<CinemaContact />} />
                <Route path="/cinema/:slug/booking" element={<CinemaBooking />} />
                <Route path="/cinema/:slug/book" element={<BookingFlow />} />
                <Route path="/cinema/:slug/staff" element={<StaffLogin />} />
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
                path="/concessions"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <ConcessionManagement />
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
              <Route
                path="/messages"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
                    <ContactSubmissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
                    <JobApplications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/box-office"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'box_office']}>
                    <BoxOffice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gate"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'gate_staff']}>
                    <GateStaff />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
                    <SupportTickets />
                  </ProtectedRoute>
                }
              />
              
              {/* Platform Admin Routes */}
              <Route path="/platform-admin/login" element={<PlatformAdminLogin />} />
              <Route
                path="/platform-admin"
                element={
                  <PlatformProtectedRoute>
                    <PlatformDashboard />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/cinemas"
                element={
                  <PlatformProtectedRoute>
                    <PlatformCinemas />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/plans"
                element={
                  <PlatformProtectedRoute>
                    <PlatformPlans />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/transactions"
                element={
                  <PlatformProtectedRoute>
                    <PlatformTransactions />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/tickets"
                element={
                  <PlatformProtectedRoute>
                    <PlatformTickets />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/settings"
                element={
                  <PlatformProtectedRoute>
                    <PlatformSettings />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/domains"
                element={
                  <PlatformProtectedRoute>
                    <PlatformDomains />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/users"
                element={
                  <PlatformProtectedRoute>
                    <PlatformUsers />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/monitoring"
                element={
                  <PlatformProtectedRoute>
                    <PlatformMonitoring />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/reports"
                element={
                  <PlatformProtectedRoute>
                    <PlatformReports />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/audit-logs"
                element={
                  <PlatformProtectedRoute>
                    <PlatformAuditLogs />
                  </PlatformProtectedRoute>
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
  </ErrorBoundary>
);

export default App;
