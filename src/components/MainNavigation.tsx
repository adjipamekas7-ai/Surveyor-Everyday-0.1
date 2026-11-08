import React from 'react';
import { Home, Map, Compass, Settings } from 'lucide-react';

export type MainTabType = 'home' | 'map' | 'compass' | 'settings';

interface MainNavigationProps {
  activeTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  isMapPlotting?: boolean;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  activeTab,
  onChangeTab,
  isMapPlotting = false,
}) => {
  // If user is actively plotting lines or polygons on the map, collapse nav to avoid thumb obstruction
  if (isMapPlotting && activeTab === 'map') {
    return null;
  }

  const tabs: Array<{ id: MainTabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'map', label: 'Peta', icon: Map },
    { id: 'compass', label: 'Kompas', icon: Compass },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[550] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-blue-100 dark:border-blue-900/40 px-2 py-1.5 pb-safe shadow-[0_-4px_20px_rgba(37,99,235,0.08)]">
      <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px] font-medium tracking-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
