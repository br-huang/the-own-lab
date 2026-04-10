import * as React from "react";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import type { LegendPayload, Props as DefaultLegendContentProps } from "recharts/types/component/DefaultLegendContent";

import { cn } from "@/lib/utils";

type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
}) {
  const chartId = React.useId().replace(/:/g, "");
  const resolvedId = `chart-${id ?? chartId}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={resolvedId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={resolvedId} config={config} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color);

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: colorConfig
          .map(
            ([key, item]) => `
[data-chart=${id}] {
  --color-${key}: ${item.color};
}`
          )
          .join("\n"),
      }}
    />
  );
}

function ChartTooltipContent({
  active,
  payload,
  className,
  hideLabel = false,
  hideIndicator = false,
  indicator = "dot",
  formatter,
  labelFormatter,
}: React.ComponentProps<"div"> &
  Pick<TooltipProps<number, string>, "active" | "formatter" | "labelFormatter"> & {
    payload?: ReadonlyArray<Payload<number, string>>;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
  }) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const label = payload[0]?.dataKey ? config[String(payload[0].dataKey)]?.label : payload[0]?.name;

  return (
    <div
      className={cn("bg-background grid min-w-[8rem] gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl", className)}
    >
      {!hideLabel ? (
        <div className="font-medium">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "value");
          const itemConfig = config[key];
          const color = item.color ?? itemConfig?.color ?? "var(--foreground)";

          return (
            <div key={key} className="flex items-center gap-2">
              {!hideIndicator ? (
                <div
                  className={cn(
                    "shrink-0 rounded-[2px]",
                    indicator === "dot" && "size-2.5",
                    indicator === "line" && "h-2.5 w-1",
                    indicator === "dashed" && "h-0 w-4 border-t border-dashed"
                  )}
                  style={{
                    backgroundColor: indicator !== "dashed" ? color : undefined,
                    borderColor: indicator === "dashed" ? color : undefined,
                  }}
                />
              ) : null}
              <div className="flex flex-1 items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {formatter
                    ? formatter(item.value, item.name, item, payload.indexOf(item), payload)
                    : (itemConfig?.label ?? item.name)}
                </span>
                <span className="font-mono font-medium tabular-nums">
                  {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegendContent({
  className,
  payload,
  verticalAlign = "bottom",
  hideIcon = false,
}: React.ComponentProps<"div"> &
  Pick<DefaultLegendContentProps, "payload"> & {
    verticalAlign?: "top" | "bottom" | "middle";
    hideIcon?: boolean;
  }) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item: LegendPayload) => {
        const key = String(item.dataKey ?? item.value ?? "");
        const itemConfig = config[key];
        const Icon = itemConfig?.icon;

        return (
          <div key={key} className="flex items-center gap-1.5">
            {hideIcon ? null : Icon ? (
              <Icon />
            ) : (
              <div
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span>{itemConfig?.label ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

const ChartTooltip = Tooltip;
const ChartLegend = Legend;
const ChartGrid = CartesianGrid;

export {
  type ChartConfig,
  ChartContainer,
  ChartGrid,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
