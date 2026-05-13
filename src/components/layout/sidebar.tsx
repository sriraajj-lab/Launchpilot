'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { clsx } from 'clsx';
import {
  Rocket, LayoutDashboard, Megaphone, Globe, Key, FileText,
  Settings, ChevronLeft, ChevronRight, Zap, LogOut, User,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Social Pages', href: '/social-pages', icon: Globe },
  { name: 'Quick Submit', href: '/quick-submit', icon: Zap },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Accounts', href: '/accounts', icon: Key },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') return null;

  return (
    <aside className={clsx('flex flex-col bg-gray-900 text-white transition-all duration-300', collapsed ? 'w-16' : 'w-64')}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <Rocket className="text-brand-400 flex-shrink-0" size={28} />
        {!collapsed && <span className="text-lg font-bold tracking-tight">SparkBill</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} title={collapsed ? item.name : undefined}
              className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white')}>
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {session?.user && (
        <div className="px-2 pb-2 border-t border-gray-800 pt-3">
          <div className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg', collapsed ? 'justify-center' : '')}>
            <div className="w-8 h-8 bg-brand-700 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{session.user.name || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
              </div>
            )}
          </div>
          <button onClick={() => signOut()} title="Sign out"
            className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full mt-1',
              collapsed ? 'justify-center' : '')}>
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center py-3 border-t border-gray-800 text-gray-400 hover:text-white transition-colors">
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </aside>
  );
}
