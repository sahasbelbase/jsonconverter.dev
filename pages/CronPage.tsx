import React, { useMemo, useState } from 'react';
import cronstrue from 'cronstrue';
import { AlertCircle, CalendarClock } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { TOOL_BY_PATH } from '../lib/tools';
import { nextRuns } from '../utils/cronUtils';

const tool = TOOL_BY_PATH.get('/cron-parser')!;

const PRESETS: { label: string; expression: string }[] = [
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Every 15 minutes', expression: '*/15 * * * *' },
  { label: 'Hourly, on the hour', expression: '0 * * * *' },
  { label: 'Daily at 02:30', expression: '30 2 * * *' },
  { label: 'Weekdays at 09:00', expression: '0 9 * * 1-5' },
  { label: 'Every Sunday at midnight', expression: '0 0 * * 0' },
  { label: 'First of the month', expression: '0 0 1 * *' },
  { label: 'Quarterly', expression: '0 0 1 1,4,7,10 *' },
];

const FIELDS = [
  { name: 'Minute', range: '0–59', extra: '*/5 = every 5th minute' },
  { name: 'Hour', range: '0–23', extra: '0 = midnight' },
  { name: 'Day of month', range: '1–31', extra: 'L = last day (not all schedulers)' },
  { name: 'Month', range: '1–12 or JAN–DEC', extra: '1,4,7,10 = quarterly' },
  { name: 'Day of week', range: '0–6 or SUN–SAT', extra: '0 and 7 both mean Sunday' },
];

const CronPage: React.FC = () => {
  const [expression, setExpression] = useLocalStorageState('cronExpression', '30 2 * * 1-5');
  const [count, setCount] = useState(8);

  const description = useMemo(() => {
    const value = expression.trim();
    if (!value) return { text: '', error: null as string | null };
    try {
      return { text: cronstrue.toString(value, { verbose: true }), error: null };
    } catch (e) {
      return { text: '', error: String(e).replace(/^Error:\s*/, '') };
    }
  }, [expression]);

  const runs = useMemo(() => {
    if (description.error || !expression.trim()) return [];
    try {
      return nextRuns(expression.trim(), count);
    } catch {
      return [];
    }
  }, [expression, count, description.error]);

  const parts = expression.trim().split(/\s+/);

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Reading a cron expression</h2>
          <p>
            Five fields, in this order: minute, hour, day of month, month, day of week. A{' '}
            <code>*</code> means “every”, a <code>/</code> means “every nth”, a comma lists values
            and a hyphen gives a range.
          </p>
          <h3>The day-of-month / day-of-week trap</h3>
          <p>
            When <em>both</em> the day-of-month and day-of-week fields are restricted, standard cron
            runs the job if <strong>either</strong> matches — not both. So{' '}
            <code>0 0 13 * 5</code> fires on the 13th of every month <em>and</em> on every Friday,
            not only on Friday the 13th. Quartz and some cloud schedulers behave differently here,
            which is why the same expression can mean two things.
          </p>
          <h3>Time zones</h3>
          <p>
            Cron has no time zone of its own; it uses whatever the host or the scheduler is set to.
            The preview below is computed in your local zone (
            <code>{Intl.DateTimeFormat().resolvedOptions().timeZone}</code>), so compare it against
            the zone your server actually runs in before trusting it.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3 p-2">
        <div className="flex-none">
          <div className="flex items-center gap-2">
            <input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              spellCheck={false}
              placeholder="* * * * *"
              className={`flex-1 px-4 py-3 font-mono text-lg tracking-wide rounded-xl border bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary ${
                description.error ? 'border-red-400 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            <CopyButton value={expression} label="Copy" />
          </div>

          <div className="grid grid-cols-5 gap-1 mt-2">
            {FIELDS.map((field, i) => (
              <div
                key={field.name}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center"
                title={field.extra}
              >
                <code className="block font-mono text-sm font-bold text-primary truncate">
                  {parts[i] ?? '—'}
                </code>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {field.name}
                </span>
                <span className="block text-[10px] text-gray-400 dark:text-gray-600 truncate">
                  {field.range}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`flex-none rounded-xl p-4 border ${
            description.error
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
              : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
          }`}
        >
          {description.error ? (
            <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {description.error}
            </p>
          ) : (
            <p className="flex items-start gap-2 text-base font-medium text-blue-900 dark:text-blue-200">
              <CalendarClock size={18} className="mt-0.5 shrink-0" />
              {description.text || 'Enter a cron expression.'}
            </p>
          )}
        </div>

        <div className="flex-1 grid lg:grid-cols-2 gap-3 min-h-[200px]">
          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Next runs (local time)
              </span>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5"
              >
                {[5, 8, 15, 25].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <ul className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
              {runs.length === 0 && (
                <li className="p-4 text-sm text-gray-400">No upcoming runs to show.</li>
              )}
              {runs.map((date, i) => (
                <li key={i} className="px-3 py-1.5 flex items-center gap-3 text-sm">
                  <span className="w-6 text-xs text-gray-400 tabular-nums">{i + 1}</span>
                  <span className="font-mono">
                    {date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Common schedules</span>
            </div>
            <ul className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
              {PRESETS.map((preset) => (
                <li key={preset.expression}>
                  <button
                    onClick={() => setExpression(preset.expression)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <span className="text-sm">{preset.label}</span>
                    <code className="font-mono text-xs text-primary shrink-0">{preset.expression}</code>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ToolShell>
  );
};

export default CronPage;
