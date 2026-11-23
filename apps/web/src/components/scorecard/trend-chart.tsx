import { useState } from "react";

import {
  formatDate,
  formatScore,
  formatWeekRange,
  GoalType,
  MeasurableStatus,
  type Measurable,
} from "@repo/library";
import { cn } from "@repo/ui";

import { SCORE_STATUS } from "@/components/scorecard/score-status";
import { niceScale } from "@/lib/chart-scale";

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 20, right: 16, bottom: 30, left: 48 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function linePath(points: { x: number; y: number | null }[]): string {
  let path = "";
  let drawing = false;
  for (const point of points) {
    if (point.y === null) {
      drawing = false;
      continue;
    }
    path += `${drawing ? "L" : "M"}${point.x},${point.y}`;
    drawing = true;
  }
  return path;
}

export function StatusMarker({
  status,
  x,
  y,
  size = 5,
}: {
  status: MeasurableStatus;
  x: number;
  y: number;
  size?: number;
}) {
  if (status === MeasurableStatus.OFF_TRACK) {
    const r = size + 1.5;
    return (
      <path
        d={`M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}Z`}
        className="fill-destructive stroke-card"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    );
  }
  return <circle cx={x} cy={y} r={size} className="fill-success stroke-card" strokeWidth={2} />;
}

interface TrendChartProps {
  measurable: Measurable;
  weeks: string[];
}

export function TrendChart({ measurable, weeks }: TrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const cells = new Map(measurable.cells.map((cell) => [cell.weekStart, cell]));
  const points = weeks.map((week) => ({
    week,
    value: cells.get(week)?.value ?? null,
    status: cells.get(week)?.status ?? MeasurableStatus.PENDING,
  }));
  const { goal, unit } = measurable;
  const goalLines = (goal.type === GoalType.BETWEEN ? [goal.min, goal.max] : [goal.value]).filter(
    (value): value is number => value !== null,
  );

  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]));
  const top = Math.max(...values, ...goalLines, 0);
  const { max, ticks } = niceScale(top * 1.1);
  const y = (value: number) => PAD.top + PLOT_H - (Math.max(0, value) / max) * PLOT_H;

  const band = PLOT_W / points.length;
  const xOf = (index: number) => PAD.left + band * index + band / 2;
  const coords = points.map((point, index) => ({
    x: xOf(index),
    y: point.value === null ? null : y(point.value),
  }));
  const latestIndex = points.map((point) => point.value !== null).lastIndexOf(true);
  const active = hovered === null ? null : points[hovered];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${measurable.name}, weekly values for the last ${points.length} weeks`}
        className="block h-auto w-full"
        onMouseLeave={() => setHovered(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick)}
              dy="0.35em"
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {formatScore(tick, unit)}
            </text>
          </g>
        ))}

        {goal.type === GoalType.BETWEEN && goal.min !== null && goal.max !== null ? (
          <rect
            x={PAD.left}
            width={PLOT_W}
            y={y(goal.max)}
            height={y(goal.min) - y(goal.max)}
            className="fill-success/10"
          />
        ) : null}
        {goalLines.map((line) => (
          <g key={line}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(line)}
              y2={y(line)}
              className="stroke-ink"
              strokeWidth={1.5}
            />
            <text
              x={WIDTH - PAD.right}
              y={y(line) - 6}
              textAnchor="end"
              className="fill-foreground text-[11px] font-semibold"
            >
              Goal {formatScore(line, unit)}
            </text>
          </g>
        ))}

        {hovered !== null ? (
          <line
            x1={xOf(hovered)}
            x2={xOf(hovered)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
          />
        ) : null}

        <path
          d={linePath(coords)}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point, index) =>
          point.value === null ? null : (
            <StatusMarker
              key={point.week}
              status={point.status}
              x={xOf(index)}
              y={y(point.value)}
              size={hovered === index ? 6 : 5}
            />
          ),
        )}

        {latestIndex >= 0 ? (
          <text
            x={xOf(latestIndex)}
            y={y(points[latestIndex]!.value ?? 0) - 12}
            textAnchor="middle"
            className="fill-foreground text-[12px] font-bold"
          >
            {formatScore(points[latestIndex]!.value ?? 0, unit)}
          </text>
        ) : null}

        {points.map((point, index) => (
          <g key={point.week}>
            {index % 2 === points.length % 2 || index === points.length - 1 ? (
              <text
                x={xOf(index)}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {formatDate(point.week)}
              </text>
            ) : null}
            <rect
              x={PAD.left + band * index}
              y={PAD.top}
              width={band}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
            />
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y(0)}
          y2={y(0)}
          className="stroke-input"
          strokeWidth={1}
        />
      </svg>

      {active && hovered !== null ? (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-lg",
          )}
          style={{
            left: `${Math.min(88, Math.max(12, (xOf(hovered) / WIDTH) * 100))}%`,
          }}
        >
          <p className="text-xs text-muted-foreground">{formatWeekRange(active.week)}</p>
          <p className="font-bold tabular-nums">
            {active.value === null ? "No number" : formatScore(active.value, unit)}
          </p>
          <p className="text-xs font-semibold">
            {SCORE_STATUS[active.status].label} · {SCORE_STATUS[active.status].meaning}
          </p>
        </div>
      ) : null}
    </div>
  );
}
