import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

/** One copy-to-clipboard button instead of the six near-identical ones there were. */
const CopyButton: React.FC<CopyButtonProps> = ({ value, label, className = '', disabled }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked (insecure context or denied permission) */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled || !value}
      title={label ?? 'Copy'}
      aria-label={label ?? 'Copy'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
};

export default CopyButton;
