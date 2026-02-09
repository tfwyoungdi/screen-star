import { ReactNode, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useRealtimeContactSubmissions } from '@/hooks/useRealtimeContactSubmissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  Film,
  LogOut,
  LayoutDashboard,
  Users,
  Settings,
  Globe,
  Monitor,
  Calendar,
  BarChart3,
  QrCode,
  Tag,
  Clapperboard,
  ExternalLink,
  Popcorn,
  Mail,
  Briefcase,
  Ticket,
  Gift,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Context for sharing new messages count across the dashboard
interface DashboardNotificationsContextType {
  newMessagesCount: number;
  resetNewMessagesCount: () => void;
}

const DashboardNotificationsContext = createContext<DashboardNotificationsContextType>({
  newMessagesCount: 0,
  resetNewMessagesCount: () => {},
});

export const useDashboardNotifications = () => useContext(DashboardNotificationsContext);

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Box Office', url: '/box-office', icon: Ticket },
  { title: 'Movies', url: '/movies', icon: Film },
  { title: 'Screens', url: '/screens', icon: Monitor },
  { title: 'Showtimes', url: '/showtimes', icon: Calendar },
  { title: 'Concessions', url: '/concessions', icon: Popcorn },
  { title: 'Promos', url: '/promos', icon: Tag },
  { title: 'Loyalty', url: '/loyalty', icon: Gift },
  { title: 'Sales', url: '/sales', icon: BarChart3 },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'AI Predictions', url: '/predictions', icon: Brain },
  { title: 'Messages', url: '/messages', icon: Mail, showBadge: true },
  { title: 'Applications', url: '/applications', icon: Briefcase },
  { title: 'Scanner', url: '/scanner', icon: QrCode },
  { title: 'Staff', url: '/staff', icon: Users },
  { title: 'Settings', url: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
}

function SidebarContentWrapper({ newMessagesCount }: { newMessagesCount: number }) {
  const { signOut } = useAuth();
  const { data: organization, isLoading: loading } = useOrganization();
  const { isImpersonating, impersonatedOrganization } = useImpersonation();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Use impersonated org if in impersonation mode
  const displayOrg = isImpersonating ? impersonatedOrganization : organization;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Helper to check if a nav item should show badge
  const getBadgeCount = (item: typeof navItems[0]) => {
    if (item.url === '/messages' && item.showBadge) {
      return newMessagesCount;
    }
    return 0;
  };

  return (
    <Sidebar
      className={cn(
        'border-r border-sidebar-border bg-sidebar transition-all duration-300',
        isCollapsed ? 'w-[70px]' : 'w-[240px]'
      )}
      collapsible="icon"
    >
      {/* Logo Section */}
      <div className="h-16 border-b border-sidebar-border flex items-center px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {displayOrg?.logo_url ? (
              <img
                src={displayOrg.logo_url}
                alt={displayOrg.name}
                className="h-9 max-w-[120px] rounded-xl object-contain"
              />
            ) : (
              <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center">
                <Clapperboard className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="font-bold text-sidebar-foreground truncate">
              {displayOrg?.name || 'Cinitix'}
            </span>
          )}
        </div>
      </div>

      <SidebarContent className="flex-1 py-4">
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 mb-2">
                Menu
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {navItems.slice(0, 11).map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/dashboard'}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                            'hover:bg-sidebar-accent',
                            isActive && 'bg-primary/10 text-primary'
                          )}
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] flex-shrink-0',
                              isActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                          {!isCollapsed && (
                            <span className="text-sm flex-1">{item.title}</span>
                          )}
                          {!isCollapsed && getBadgeCount(item) > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {getBadgeCount(item)}
                            </Badge>
                          )}
                          {isCollapsed && getBadgeCount(item) > 0 && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-6">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 mb-2">
                General
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {navItems.slice(11).map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                            'hover:bg-sidebar-accent',
                            isActive && 'bg-primary/10 text-primary'
                          )}
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] flex-shrink-0',
                              isActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                          {!isCollapsed && (
                            <span className="text-sm">{item.title}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {displayOrg && (
            <SidebarGroup className="mt-4">
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={`/cinema/${displayOrg.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                        title="View Public Website"
                      >
                        <Globe className="h-[18px] w-[18px]" />
                        {!isCollapsed && (
                          <>
                            <span className="text-sm flex-1">View Public Website</span>
                            <ExternalLink className="h-3 w-3" />
                          </>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
      </SidebarContent>

      {/* Logout Section */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'sm'}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl',
            !isCollapsed && 'justify-start'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </Sidebar>
  );
}

export function DashboardLayout({
  children,
  showSearch = true,
  showAddButton = false,
  addButtonLabel,
  onAddClick,
}: DashboardLayoutProps) {
  const { isImpersonating, impersonatedOrganization } = useImpersonation();
  const { data: organization } = useOrganization();
  
  // Use impersonated org if in impersonation mode
  const effectiveOrg = isImpersonating ? impersonatedOrganization : organization;
  
  // Enable real-time contact message notifications
  const { newMessagesCount, resetNewMessagesCount } = useRealtimeContactSubmissions({
    enabled: !!effectiveOrg?.id && !isImpersonating,
    organizationId: effectiveOrg?.id,
  });
  
  return (
    <DashboardNotificationsContext.Provider value={{ newMessagesCount, resetNewMessagesCount }}>
      <SidebarProvider>
        <div className={cn("min-h-screen flex w-full bg-background", isImpersonating && "pt-10")}>
          <SidebarContentWrapper newMessagesCount={newMessagesCount} />

          <main className="flex-1 flex flex-col min-w-0">
            <DashboardHeader
              showSearch={showSearch}
              showAddButton={showAddButton}
              addButtonLabel={addButtonLabel}
              onAddClick={onAddClick}
            />
            <div className="flex-1 p-6 lg:p-8 overflow-auto">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </DashboardNotificationsContext.Provider>
  );
}
