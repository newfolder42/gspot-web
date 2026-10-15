'use client';

import { useState } from 'react';
import { Field, inputClass } from '@/components/ui';
import { SHAPE_LABELS, SHAPE_TYPES, type ShapeType } from '@/lib/labels';

/** The shape-dependent part of the location form: pasted JSON for a polygon, three numbers for a circle. */
export default function LocationShapeFields() {
  const [shape, setShape] = useState<ShapeType>('polygon');

  return (
    <>
      <Field label="ფორმა" required>
        <select
          name="shapeType"
          value={shape}
          onChange={(e) => setShape(e.target.value as ShapeType)}
          className={inputClass}
        >
          {SHAPE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SHAPE_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      {shape === 'polygon' ? (
        <Field
          label="JSON"
          required
        >
          <textarea
            name="polygon"
            rows={8}
            spellCheck={false}
            placeholder="[[44.8008746,41.692754],[44.8021694,41.6927625],[44.8024253,41.6939405]]"
            className={`${inputClass} font-mono text-xs`}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Field label="განედი" required>
            <input name="latitude" type="number" step="any" placeholder="41.6883" className={inputClass} />
          </Field>
          <Field label="გრძედი" required>
            <input name="longitude" type="number" step="any" placeholder="44.809" className={inputClass} />
          </Field>
          <Field label="რადიუსი (მ)" required>
            <input name="radiusM" type="number" min={1} step={1} placeholder="120" className={inputClass} />
          </Field>
        </div>
      )}
    </>
  );
}
