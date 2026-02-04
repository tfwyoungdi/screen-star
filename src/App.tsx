import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";
import { ImpersonationProvider } from "@/hooks/useImpersonation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PlatformProtectedRoute } from "@/components/auth/PlatformProtectedRoute";
import { ImpersonationBanner } from "@/components/platform-admin/ImpersonationBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChoosePlan from "./pages/ChoosePlan";
import SubscriptionCallback from "./pages/SubscriptionCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CinemaSettings from "./pages/CinemaSettings";
import StaffManagement from "./pages/StaffManagement";
import MovieManagement from "./pages/MovieManagement";
import ScreenManagement from "./pages/ScreenManagement";
import ShowtimeManagement from "./pages/ShowtimeManagement";
import SalesDashboard from "./pages/SalesDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import TicketScanner from "./pages/TicketScanner";
import PromoCodeManagement from "./pages/PromoCodeManagement";
import LoyaltyProgram from "./pages/LoyaltyProgram";
import AcceptInvitation from "./pages/AcceptInvitation";
import PublicCinema from "./pages/PublicCinema";
import BookingFlow from "./pages/BookingFlow";
import CinemaBooking from "./pages/CinemaBooking";
import CustomerManagement from "./pages/CustomerManagement";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import PredictiveAnalytics from "./pages/PredictiveAnalytics";
import ConcessionManagement from "./pages/ConcessionManagement";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerSignup from "./pages/CustomerSignup";
import CustomerAccount from "./pages/CustomerAccount";
import CustomerForgotPassword from "./pages/CustomerForgotPassword";
import CustomerResetPassword from "./pages/CustomerResetPassword";

import CinemaCareers from "./pages/CinemaCareers";
import CinemaContact from "./pages/CinemaContact";
import ContactSubmissions from "./pages/ContactSubmissions";
import JobApplications from "./pages/JobApplications";
import BoxOffice from "./pages/BoxOffice";
import GateStaff from "./pages/GateStaff";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import SupervisorDashboard from "./pages/SupervisorDashboard";
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
import PlatformSLA from "./pages/platform-admin/PlatformSLA";
import PlatformCommunications from "./pages/platform-admin/PlatformCommunications";
import PlatformCustomers from "./pages/platform-admin/PlatformCustomers";
import PlatformMarketingDashboard from "./pages/platform-admin/PlatformMarketingDashboard";
import PlatformAccountsDashboard from "./pages/platform-admin/PlatformAccountsDashboard";
import PlatformDevDashboard from "./pages/platform-admin/PlatformDevDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <AuthProvider>
            <CustomerAuthProvider>
              <ImpersonationProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <ImpersonationBanner />
                  <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/choose-plan" element={<ChoosePlan />} />
                  <Route path="/subscription-callback" element={<SubscriptionCallback />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/accept-invitation" element={<AcceptInvitation />} />
                  {/* Public Cinema Routes */}
                  <Route path="/cinema/:slug" element={<PublicCinema />} />
                  <Route path="/cinema/:slug/careers" element={<CinemaCareers />} />
                  <Route path="/cinema/:slug/contact" element={<CinemaContact />} />
                  <Route path="/cinema/:slug/booking" element={<CinemaBooking />} />
                  <Route path="/cinema/:slug/book" element={<BookingFlow />} />
                  <Route path="/cinema/:slug/staff" element={<StaffLogin />} />
                  {/* Customer Auth Routes */}
                  <Route path="/cinema/:slug/login" element={<CustomerLogin />} />
                  <Route path="/cinema/:slug/signup" element={<CustomerSignup />} />
                  <Route path="/cinema/:slug/account" element={<CustomerAccount />} />
                  <Route path="/cinema/:slug/forgot-password" element={<CustomerForgotPassword />} />
                  <Route path="/cinema/:slug/reset-password" element={<CustomerResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/movies"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
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
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
                    <SalesDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accountant"
                element={
                  <ProtectedRoute allowedRoles={['accountant']}>
                    <AccountantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scanner"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager', 'supervisor']}>
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
                  <ProtectedRoute allowedRoles={['cinema_admin', 'supervisor']}>
                    <StaffManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor"
                element={
                  <ProtectedRoute allowedRoles={['supervisor']}>
                    <SupervisorDashboard />
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
                path="/loyalty"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin']}>
                    <LoyaltyProgram />
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
                path="/predictions"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'manager']}>
                    <PredictiveAnalytics />
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
                  <ProtectedRoute allowedRoles={['cinema_admin', 'box_office', 'supervisor']}>
                    <BoxOffice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gate"
                element={
                  <ProtectedRoute allowedRoles={['cinema_admin', 'gate_staff', 'supervisor']}>
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
                  <PlatformProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformDashboard />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/marketing"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_marketing']}>
                    <PlatformMarketingDashboard />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/accounts"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_accounts']}>
                    <PlatformAccountsDashboard />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/dev"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_dev']}>
                    <PlatformDevDashboard />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/cinemas"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformCinemas />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/plans"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_accounts']}>
                    <PlatformPlans />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/transactions"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_accounts']}>
                    <PlatformTransactions />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/tickets"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformTickets />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/settings"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformSettings />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/domains"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_dev']}>
                    <PlatformDomains />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/users"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformUsers />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/monitoring"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_dev']}>
                    <PlatformMonitoring />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/reports"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_marketing', 'platform_accounts']}>
                    <PlatformReports />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/audit-logs"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_dev']}>
                    <PlatformAuditLogs />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/sla"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin']}>
                    <PlatformSLA />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/communications"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_marketing']}>
                    <PlatformCommunications />
                  </PlatformProtectedRoute>
                }
              />
              <Route
                path="/platform-admin/customers"
                element={
                  <PlatformProtectedRoute allowedRoles={['platform_admin', 'platform_marketing']}>
                    <PlatformCustomers />
                  </PlatformProtectedRoute>
                }
              />
              
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ImpersonationProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
