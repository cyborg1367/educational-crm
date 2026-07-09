"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCount, formatToman } from "@/lib/locale/number";
import { cn } from "@/lib/utils";

export type AnalyticsValueFormat = "toman" | "count";

export type AnalyticsChartData =
  | {
      variant: "line";
      title: string;
      points: { label: string; value: number }[];
      valueFormat: AnalyticsValueFormat;
    }
  | {
      variant: "bar";
      title: string;
      items: { label: string; value: number }[];
      valueFormat: AnalyticsValueFormat;
    }
  | {
      variant: "gauge";
      title: string;
      percent: number;
      subtitles?: string[];
    };

export type AnalyticsChartProps = {
  data: AnalyticsChartData;
  className?: string;
  height?: number;
};

function formatAxisTick(value: number, valueFormat: AnalyticsValueFormat): string {
  if (valueFormat === "toman") {
    return formatToman(Math.floor(value));
  }
  return formatCount(Math.round(value));
}

function formatChartValue(
  value: number,
  valueFormat: AnalyticsValueFormat,
): string {
  if (valueFormat === "toman") {
    return formatToman(Math.floor(Number(value)), { suffix: true });
  }
  return formatCount(Math.round(Number(value)));
}

function ChartTooltip({
  active,
  payload,
  valueFormat,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { label?: string } }>;
  valueFormat: AnalyticsValueFormat;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];
  const value = point?.value ?? 0;
  const label = point?.payload?.label ?? "";
  const formattedValue = formatChartValue(value, valueFormat);

  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-sm)] border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
        "shadow-[var(--primitive-elevation-2)]",
      )}
    >
      <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
        {label}: {formattedValue}
      </p>
    </div>
  );
}

function GaugeChart({
  percent,
  subtitles,
  size = 160,
}: {
  percent: number;
  subtitles?: string[];
  size?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${formatCount(Math.round(clamped))} درصد`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--semantic-color-surface-subtle)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--semantic-color-status-success)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="var(--semantic-color-text-primary)"
          fontSize="22"
          fontWeight="600"
        >
          {formatCount(Math.round(clamped))}٪
        </text>
      </svg>
      {subtitles && subtitles.length > 0 ? (
        <div className="mt-[var(--primitive-space-2)] space-y-[var(--primitive-space-1)] text-center">
          {subtitles.map((line) => (
            <p
              key={line}
              className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]"
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LineChartView({
  data,
  height,
}: {
  data: Extract<AnalyticsChartData, { variant: "line" }>;
  height: number;
}) {
  const chartData = data.points.map((point) => ({
    label: point.label,
    value: point.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          stroke="var(--semantic-color-surface-border)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{
            fill: "var(--semantic-color-text-secondary)",
            fontSize: 12,
          }}
          axisLine={{ stroke: "var(--semantic-color-surface-border)" }}
          tickLine={false}
        />
        <YAxis
          orientation="right"
          tickFormatter={(value: number) => formatAxisTick(value, data.valueFormat)}
          tick={{
            fill: "var(--semantic-color-text-secondary)",
            fontSize: 12,
          }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip
          content={
            <ChartTooltip valueFormat={data.valueFormat} />
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--semantic-color-action-primary)"
          strokeWidth={2}
          dot={{
            fill: "var(--semantic-color-action-primary)",
            r: 3,
          }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartView({
  data,
  height,
}: {
  data: Extract<AnalyticsChartData, { variant: "bar" }>;
  height: number;
}) {
  const chartData = data.items.map((item) => ({
    label: item.label,
    value: item.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          stroke="var(--semantic-color-surface-border)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{
            fill: "var(--semantic-color-text-secondary)",
            fontSize: 11,
          }}
          axisLine={{ stroke: "var(--semantic-color-surface-border)" }}
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={56}
        />
        <YAxis
          orientation="right"
          tickFormatter={(value: number) => formatAxisTick(value, data.valueFormat)}
          tick={{
            fill: "var(--semantic-color-text-secondary)",
            fontSize: 12,
          }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip
          content={
            <ChartTooltip valueFormat={data.valueFormat} />
          }
        />
        <Bar
          dataKey="value"
          fill="var(--semantic-color-action-primary)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AnalyticsChart({ data, className, height = 240 }: AnalyticsChartProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)]",
        "shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      <h3 className="mb-[var(--primitive-space-4)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
        {data.title}
      </h3>
      {data.variant === "line" ? (
        <LineChartView data={data} height={height} />
      ) : null}
      {data.variant === "bar" ? (
        <BarChartView data={data} height={height} />
      ) : null}
      {data.variant === "gauge" ? (
        <div className="flex justify-center py-[var(--primitive-space-4)]">
          <GaugeChart percent={data.percent} subtitles={data.subtitles} />
        </div>
      ) : null}
    </div>
  );
}

export { AnalyticsChart };
