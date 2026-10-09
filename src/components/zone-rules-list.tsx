/**
 * The zone's upload rules — what a correct location means in this zone. The same rules are
 * shown when a photo is submitted; here they are what a guesser, a reviewer and the author
 * measure a contested location against.
 */
export default function ZoneRulesList({ rules, title = 'ზონის წესები' }: { rules: string[]; title?: string }) {
  if (rules.length === 0) return null;

  return (
    <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/70 px-3 py-2.5">
      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">{title}</div>
      <ul className="space-y-0.5">
        {rules.map((rule, idx) => (
          <li key={idx} className="flex gap-1.5 text-xs leading-4 text-zinc-600 dark:text-zinc-300">
            <span className="text-zinc-400">•</span>
            <span className="flex-1">{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
