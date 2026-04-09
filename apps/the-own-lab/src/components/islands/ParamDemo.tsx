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
      <label className="control-row">
        <span className="control-label">{label}</span>
        <input
          type="range"
          min={def.min ?? 0}
          max={def.max ?? 100}
          step={def.step ?? 1}
          value={value as number}
          onChange={(e) => onChange(Number(e.target.value))}
          className="control-range flex-1"
        />
        <span className="control-value">{value}</span>
      </label>
    );
  }

  if (def.type === "boolean") {
    return (
      <label className="control-row">
        <span className="control-label">{label}</span>
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="control-checkbox"
        />
      </label>
    );
  }

  if (def.type === "select" && def.options) {
    return (
      <label className="control-row">
        <span className="control-label">{label}</span>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="control-input"
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
    <div className="interactive-shell p-4">
      <div className="interactive-header space-y-3">
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
