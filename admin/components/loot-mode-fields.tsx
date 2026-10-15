'use client';

import { useState } from 'react';
import { Field, inputClass } from '@/components/ui';
import { GRANT_MODES, type GrantMode } from '@/lib/labels';

/** Grant mode and, only for 'probability', the chance — mandatory rows carry none. */
export default function LootModeFields() {
  const [mode, setMode] = useState<GrantMode>('mandatory');

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="რეჟიმი" required>
        <select
          name="grantMode"
          value={mode}
          onChange={(e) => setMode(e.target.value as GrantMode)}
          className={inputClass}
        >
          {GRANT_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      {mode === 'probability' && (
        <Field label="ალბათობა (%)" required>
          <input name="probabilityPercent" type="number" min={1} max={100} step={1} className={inputClass} />
        </Field>
      )}
    </div>
  );
}
