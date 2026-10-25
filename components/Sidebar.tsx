import React from 'react';
import { NavLink } from 'react-router-dom';
import { TOOLS } from '../lib/tools';

const GROUP_LABELS: Record<string, string> = {
  json: 'JSON',
  text: 'Text',
  web: 'Web',
  generate: 'Generate',
};

const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const groups = ['json', 'text', 'web', 'generate'] as const;

  return (
    <nav
      aria-label="Tools"
      className="h-full w-16 hover:w-60 focus-within:w-60 group bg-white dark:bg-dark-secondary border-r border-gray-200 dark:border-gray-700 flex flex-col py-3 gap-0.5 transition-[width] duration-200 shadow-xl overflow-y-auto overflow-x-hidden scrollbar-hide"
    >
      {groups.map((group) => (
        <div key={group} className="contents">
          <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {GROUP_LABELS[group]}
          </div>
          {TOOLS.filter((tool) => tool.group === group).map((tool) => {
            const Icon = tool.icon;
            return (
              <NavLink
                key={tool.id}
                to={tool.path}
                onClick={onNavigate}
                title={tool.label}
                className={({ isActive }) =>
                  `flex items-center w-[calc(100%-12px)] px-3 py-2.5 mx-1.5 rounded-lg transition-colors shrink-0 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-primary'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                  }`
                }
              >
                <span className="shrink-0">
                  <Icon size={22} />
                </span>
                <span className="ml-3 flex flex-col items-start whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  <span className="text-sm font-medium leading-tight">{tool.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{tool.desc}</span>
                </span>
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default Sidebar;
