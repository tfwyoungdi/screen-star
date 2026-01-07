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
  Clapperboard,
  ExternalLink,
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
                className="h-10 w-10 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
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
                  <span className="font-bold text-sidebar-foreground block truncate">
                    {organization?.name || 'CineTix'}
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    Cinema Dashboard
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        <SidebarContent>
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold px-4 mb-2">
                Menu
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/dashboard'}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                            'hover:bg-sidebar-accent group',
                            isActive && 'bg-primary/10 text-primary'
                          )}
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                          {!isCollapsed && (
                            <span className="text-sm font-medium">{item.title}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {organization && !isCollapsed && (
            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold px-4 mb-2">
                External
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={`/cinema/${organization.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent transition-colors group"
                      >
                        <Globe className="h-[18px] w-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="text-sm font-medium flex-1">Public Site</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
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
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl',
            !isCollapsed && 'justify-start'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!isCollapsed && <span className="ml-2 font-medium">Logout</span>}
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
          <div className="flex-1 p-6 lg:p-8 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
