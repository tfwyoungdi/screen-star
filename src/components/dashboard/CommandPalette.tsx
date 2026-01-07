import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Film,
  LayoutDashboard,
  Users,
  Settings,
  Monitor,
  Calendar,
  BarChart3,
  QrCode,
  Tag,
  Globe,
  Search,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useUserProfile';
import { useTheme } from 'next-themes';

const navigationItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { title: 'Movies', url: '/movies', icon: Film, keywords: ['films', 'add movie'] },
  { title: 'Screens', url: '/screens', icon: Monitor, keywords: ['halls', 'rooms'] },
  { title: 'Showtimes', url: '/showtimes', icon: Calendar, keywords: ['schedule', 'times'] },
  { title: 'Promo Codes', url: '/promos', icon: Tag, keywords: ['discounts', 'coupons'] },
  { title: 'Sales', url: '/sales', icon: BarChart3, keywords: ['analytics', 'revenue', 'reports'] },
  { title: 'Scanner', url: '/scanner', icon: QrCode, keywords: ['tickets', 'gate'] },
  { title: 'Staff', url: '/staff', icon: Users, keywords: ['team', 'employees'] },
  { title: 'Settings', url: '/settings', icon: Settings, keywords: ['profile', 'config'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: organization } = useOrganization();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.url}
              value={`${item.title} ${item.keywords.join(' ')}`}
              onSelect={() => runCommand(() => navigate(item.url))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {organization && (
          <>
            <CommandSeparator />
            <CommandGroup heading="External">
              <CommandItem
                value="public site booking page"
                onSelect={() => runCommand(() => window.open(`/cinema/${organization.slug}`, '_blank'))}
              >
                <Globe className="mr-2 h-4 w-4" />
                <span>Open Public Booking Site</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem
            value="light mode theme"
            onSelect={() => runCommand(() => setTheme('light'))}
          >
            <Sun className="mr-2 h-4 w-4" />
            <span>Light Mode</span>
            {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </CommandItem>
          <CommandItem
            value="dark mode theme"
            onSelect={() => runCommand(() => setTheme('dark'))}
          >
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark Mode</span>
            {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem
            value="logout sign out"
            onSelect={() => runCommand(async () => {
              await signOut();
              navigate('/');
            })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
