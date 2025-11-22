import { Home, Dumbbell, Video, FileText, Settings as SettingsIcon } from 'lucide-react';
import type { PageType } from '../App';

type NavigationProps = {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
};

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const navItems = [
    { id: 'dashboard' as PageType, icon: Home, label: 'Home' },
    { id: 'plan' as PageType, icon: Dumbbell, label: 'Plan' },
    { id: 'live' as PageType, icon: Video, label: 'Live' },
    { id: 'reports' as PageType, icon: FileText, label: 'Reports' },
    { id: 'settings' as PageType, icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center py-3 px-4 transition-colors ${
                  isActive
                    ? 'text-purple-600'
                    : 'text-slate-500 hover:text-purple-600'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1`} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
