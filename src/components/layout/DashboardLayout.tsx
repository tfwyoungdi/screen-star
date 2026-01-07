import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ChevronLeft,
  ChevronRight,
  Clapperboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Movies', url: '/movies', icon: Film },
  { title: 'Screens', url: '/screens', icon: Monitor },
  { title: 'Showtimes', url: '/showtimes', icon: Calendar },
  { title: 'Promos', url: '/promos', icon: Tag },
  { title: 'Sales', url: '/sales', icon: BarChart3 },
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
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar
      className={cn(
        'border-r border-sidebar-border bg-sidebar transition-all duration-300',
        isCollapsed ? 'w-[70px]' : 'w-[260px]'
      )}
      collapsible="icon"
    >
      {/* Logo Section */}
      <div className="h-16 border-b border-sidebar-border flex items-center px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div className="h-9 w-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <Clapperboard className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              {loading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <>
                  <span className="font-bold text-sidebar-foreground block truncate text-sm">
                    {organization?.name || 'CineTix'}
                  </span>
                  {organization && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Globe className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{organization.slug}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <SidebarContent className="py-4">
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-4 mb-2">
                Menu
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1 px-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/dashboard'}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                            'hover:bg-sidebar-accent group',
                            isActive && 'bg-primary/10 text-primary'
                          )}
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon
                            className={cn(
                              'h-5 w-5 flex-shrink-0 transition-colors',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                          {!isCollapsed && (
                            <span className="text-sm">{item.title}</span>
                          )}
                          {isActive && !isCollapsed && (
                            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {organization && (
            <SidebarGroup className="mt-4">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-4 mb-2">
                  External
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={`/cinema/${organization.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors group"
                      >
                        <Globe className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        {!isCollapsed && (
                          <span className="text-sm">Public Site</span>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </ScrollArea>

      {/* Logout Section */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'sm'}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            !isCollapsed && 'justify-start'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
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
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SidebarContentWrapper />

        <main className="flex-1 flex flex-col min-w-0">
          <DashboardHeader
            showSearch={showSearch}
            showAddButton={showAddButton}
            addButtonLabel={addButtonLabel}
            onAddClick={onAddClick}
          />
          <div className="flex-1 p-6 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
