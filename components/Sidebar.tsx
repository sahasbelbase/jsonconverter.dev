import React from 'react';
import { FileJson, GitCompareArrows, FileCode2, Code, Calculator, Shield, Link } from 'lucide-react';
import { ToolMode } from '../types';

interface SidebarProps {
  activeTool: ToolMode;
  onSelect: (mode: ToolMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTool, onSelect }) => {
  const navItems = [
    {
      id: ToolMode.CONVERTER,
      icon: <FileJson size={24} />,
      label: 'Converter',
      desc: 'Format & Export'
    },
    {
      id: ToolMode.FORMAT,
      icon: <FileCode2 size={24} />,
      label: 'Formats',
      desc: 'JSON to XML/YAML'
    },
    {
      id: ToolMode.URL_ENCODER,
      icon: <Link size={24} />,
      label: 'URL Encoder',
      desc: 'Parse & Encode'
    },
    {
      id: ToolMode.JWT,
      icon: <Shield size={24} />,
      label: 'JWT Decoder',
      desc: 'Debug & Verify'
    },
    {
      id: ToolMode.HTML,
      icon: <Code size={24} />,
      label: 'HTML Viewer',
      desc: 'Beautify & View'
    },
    {
      id: ToolMode.DIFF,
      icon: <GitCompareArrows size={24} />,
      label: 'Diff',
      desc: 'Compare Text'
    },
    {
      id: ToolMode.TOKENIZER,
      icon: <Calculator size={24} />,
      label: 'Tokenizer',
      desc: 'Count Tokens'
    }
  ];

  return (
    <div className="h-full flex z-40">
      <nav className="h-full bg-white dark:bg-dark-secondary border-r border-gray-200 dark:border-gray-700 flex flex-col items-start py-4 gap-2 transition-all duration-300 w-16 hover:w-56 overflow-hidden shadow-xl group">
        
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center w-[calc(100%-12px)] px-3 py-3 mx-1.5 rounded-lg transition-all duration-200 ${
              activeTool === item.id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-primary'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title={item.label}
          >
            <span className="shrink-0">{item.icon}</span>
            <div className="ml-3 flex flex-col items-start whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{item.desc}</span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;