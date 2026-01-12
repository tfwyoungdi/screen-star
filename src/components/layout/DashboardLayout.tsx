import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Box Office', url: '/box-office', icon: Ticket },
  { title: 'Movies', url: '/movies', icon: Film },
  { title: 'Screens', url: '/screens', icon: Monitor },
  { title: 'Showtimes', url: '/showtimes', icon: Calendar },
  { title: 'Concessions', url: '/concessions', icon: Popcorn },
  { title: 'Promos', url: '/promos', icon: Tag },
  { title: 'Sales', url: '/sales', icon: BarChart3 },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Messages', url: '/messages', icon: Mail },
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

function SidebarContentWrapper() {
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
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center">
                <Clapperboard className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="font-bold text-sidebar-foreground truncate">
              {displayOrg?.name || 'CineTix'}
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
  const { isImpersonating } = useImpersonation();
  
  return (
    <SidebarProvider>
      <div className={cn("min-h-screen flex w-full bg-background", isImpersonating && "pt-10")}>
        <SidebarContentWrapper />

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
  );
}
