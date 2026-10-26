import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import SeoHead from './SeoHead';
import { TOOLS } from '../lib/tools';
import { COMMAND_PALETTE_HINT } from '../lib/platform';

const NotFound: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-6">
    <SeoHead
      title="Page not found"
      description="That page does not exist. Browse the available developer tools instead."
      path="/404"
    />
    <Compass size={48} className="text-gray-300 dark:text-gray-700" />
    <div>
      <p className="text-2xl font-bold mb-1">That page doesn’t exist</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Pick a tool below, or press <kbd className="px-1 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-800 whitespace-nowrap">{COMMAND_PALETTE_HINT}</kbd>.
      </p>
    </div>
    <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
      {TOOLS.map((tool) => (
        <Link
          key={tool.id}
          to={tool.path}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary transition-colors"
        >
          {tool.label}
        </Link>
      ))}
    </div>
  </div>
);

export default NotFound;
