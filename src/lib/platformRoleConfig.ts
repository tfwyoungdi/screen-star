import { 
  Shield, 
  Megaphone, 
  Calculator, 
  Code,
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  MessageSquare,
  Settings,
  Globe,
  Users,
  Activity,
  BarChart3,
  ScrollText,
  Timer,
  Mail,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PlatformRoleType = 
  | 'platform_admin' 
  | 'platform_marketing' 
  | 'platform_accounts' 
  | 'platform_dev';

interface RoleConfig {
  label: string;
  color: string;
  icon: LucideIcon;
  description: string;
}

export const PLATFORM_ROLE_CONFIG: Record<PlatformRoleType, RoleConfig> = {
  platform_admin: {
    label: 'Platform Admin',
    color: 'bg-purple-500/10 text-purple-500',
    icon: Shield,
    description: 'Full access to all platform features',
  },
  platform_marketing: {
    label: 'Marketing',
    color: 'bg-pink-500/10 text-pink-500',
    icon: Megaphone,
    description: 'Access to communications and customer data',
  },
  platform_accounts: {
    label: 'Accounts',
    color: 'bg-green-500/10 text-green-500',
    icon: Calculator,
    description: 'Access to financial data and subscriptions',
  },
  platform_dev: {
    label: 'Developer',
    color: 'bg-blue-500/10 text-blue-500',
    icon: Code,
    description: 'Access to technical monitoring and domains',
  },
};

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: PlatformRoleType[]; // Which roles can see this item
}

// Define all nav items with their role permissions
export const PLATFORM_NAV_ITEMS: NavItem[] = [
  { 
    title: 'Dashboard', 
    href: '/platform-admin', 
    icon: LayoutDashboard,
    roles: ['platform_admin'], // Only platform_admin sees main dashboard
  },
  { 
    title: 'Marketing', 
    href: '/platform-admin/marketing', 
    icon: Megaphone,
    roles: ['platform_marketing'], // Marketing-specific dashboard
  },
  { 
    title: 'Accounts', 
    href: '/platform-admin/accounts', 
    icon: Calculator,
    roles: ['platform_accounts'], // Accounts-specific dashboard
  },
  { 
    title: 'Developer', 
    href: '/platform-admin/dev', 
    icon: Code,
    roles: ['platform_dev'], // Dev-specific dashboard
  },
  { 
    title: 'Cinemas', 
    href: '/platform-admin/cinemas', 
    icon: Building2,
    roles: ['platform_admin'],
  },
  { 
    title: 'Customers', 
    href: '/platform-admin/customers', 
    icon: UserCircle,
    roles: ['platform_admin', 'platform_marketing'],
  },
  { 
    title: 'Subscription Plans', 
    href: '/platform-admin/plans', 
    icon: CreditCard,
    roles: ['platform_admin', 'platform_accounts'],
  },
  { 
    title: 'Transactions', 
    href: '/platform-admin/transactions', 
    icon: Receipt,
    roles: ['platform_admin', 'platform_accounts'],
  },
  { 
    title: 'Domains', 
    href: '/platform-admin/domains', 
    icon: Globe,
    roles: ['platform_admin', 'platform_dev'],
  },
  { 
    title: 'Users & Roles', 
    href: '/platform-admin/users', 
    icon: Users,
    roles: ['platform_admin'],
  },
  { 
    title: 'Communications', 
    href: '/platform-admin/communications', 
    icon: Mail,
    roles: ['platform_admin', 'platform_marketing'],
  },
  { 
    title: 'Monitoring', 
    href: '/platform-admin/monitoring', 
    icon: Activity,
    roles: ['platform_admin', 'platform_dev'],
  },
  { 
    title: 'Reports', 
    href: '/platform-admin/reports', 
    icon: BarChart3,
    roles: ['platform_admin', 'platform_marketing', 'platform_accounts'],
  },
  { 
    title: 'Audit Logs', 
    href: '/platform-admin/audit-logs', 
    icon: ScrollText,
    roles: ['platform_admin', 'platform_dev'],
  },
  { 
    title: 'SLA Dashboard', 
    href: '/platform-admin/sla', 
    icon: Timer,
    roles: ['platform_admin'],
  },
  { 
    title: 'Support Tickets', 
    href: '/platform-admin/tickets', 
    icon: MessageSquare,
    roles: ['platform_admin'],
  },
  { 
    title: 'Settings', 
    href: '/platform-admin/settings', 
    icon: Settings,
    roles: ['platform_admin'],
  },
];

// Get nav items for a specific role
export function getNavItemsForRole(role: PlatformRoleType | null): NavItem[] {
  if (!role) return [];
  
  // Platform admin gets all items
  if (role === 'platform_admin') {
    // Filter out role-specific dashboards for platform_admin (they use main dashboard)
    return PLATFORM_NAV_ITEMS.filter(item => 
      !['Marketing', 'Accounts', 'Developer'].includes(item.title)
    );
  }
  
  // Other roles get filtered items
  return PLATFORM_NAV_ITEMS.filter(item => item.roles.includes(role));
}

// Get the default route for a role
export function getDefaultRouteForRole(role: PlatformRoleType | null): string {
  switch (role) {
    case 'platform_admin':
      return '/platform-admin';
    case 'platform_marketing':
      return '/platform-admin/marketing';
    case 'platform_accounts':
      return '/platform-admin/accounts';
    case 'platform_dev':
      return '/platform-admin/dev';
    default:
      return '/platform-admin';
  }
}
