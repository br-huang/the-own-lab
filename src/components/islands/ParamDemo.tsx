import { useState } from "react";
import type { ParamDef } from "@/types/docs";
import type { ReactNode } from "react";

function initValues(params: Record<string, ParamDef>): Record<string, number | boolean | string> {
  const values: Record<string, number | boolean | string> = {};
  for (const [key, def] of Object.entries(params)) {
    values[key] = def.default;
  }
  return values;
}

function ControlInput({
  name,
  def,
  value,
  onChange,
}: {
  name: string;
  def: ParamDef;
  value: number | boolean | string;
  onChange: (value: number | boolean | string) => void;
}) {
  const label = def.label ?? name;

  if (def.type === "number") {
    return (
      <label className="flex items-center gap-3 text-sm">
        <span className="w-24 text-gray-700">{label}</span>
        <input
          type="range"
          min={def.min ?? 0}
          max={def.max ?? 100}
          step={def.step ?? 1}
          value={value as number}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-10 text-right font-mono text-gray-500">{value}</span>
      </label>
    );
  }

  if (def.type === "boolean") {
    return (
      <label className="flex items-center gap-3 text-sm">
        <span className="w-24 text-gray-700">{label}</span>
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
        />
      </label>
    );
  }

  if (def.type === "select" && def.options) {
    return (
      <label className="flex items-center gap-3 text-sm">
        <span className="w-24 text-gray-700">{label}</span>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {def.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }

  return null;
}

interface Props {
  params: Record<string, ParamDef>;
  /** Render prop — use this in MDX instead of children (MDX does not support function-as-children). */
  render: (values: Record<string, number | boolean | string>) => ReactNode;
  children?: never;
}

export default function ParamDemo({ params, render }: Props) {
  const [values, setValues] = useState(() => initValues(params));

  const updateValue = (key: string, value: number | boolean | string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="my-6 rounded-lg border border-gray-200 p-4">
      <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
        {Object.entries(params).map(([name, def]) => (
          <ControlInput
            key={name}
            name={name}
            def={def}
            value={values[name]}
            onChange={(v) => updateValue(name, v)}
          />
        ))}
      </div>
      <div>{render(values)}</div>
    </div>
  );
}
