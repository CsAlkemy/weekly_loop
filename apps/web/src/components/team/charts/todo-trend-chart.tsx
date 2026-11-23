import { useState } from "react";

import { ChartLineUpIcon } from "@phosphor-icons/react";

import { formatDate, formatWeekRange, MeasurableStatus } from "@repo/library";
import { SectionCard, Skeleton } from "@repo/ui";

import { ChartTooltip, LegendItem } from "@/components/charts/chart-tooltip";
import { StatusMarker } from "@/components/scorecard/trend-chart";
import { OpenLink } from "@/components/team/team-overview";
import { useElementWidth } from "@/hooks/use-element-width";
import { useTodos } from "@/hooks/use-todos";
import { sectionPath } from "@/lib/navigation";

const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 40 };
const TICKS = [0, 25, 50, 75, 100];
const TARGET = 90;

export function TodoTrendChart({ teamId, className }: { teamId: string; className?: string }) {
  const { data, isLoading } = useTodos(teamId);
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const weeks = data?.history ?? [];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const y = (value: number) => PAD.top + plotH - (value / 100) * plotH;
  const band = weeks.length ? plotW / weeks.length : 0;
  const x = (index: number) => PAD.left + band * index + band / 2;

  let path = "";
  let drawing = false;
  weeks.forEach((week, index) => {
    if (!week.completion) {
      drawing = false;
      return;
    }
    path += `${drawing ? "L" : "M"}${x(index)},${y(week.completion.ratePercent)}`;
    drawing = true;
  });

  const active = hovered === null ? null : weeks[hovered];
  const onTarget = weeks.filter((week) => week.completion?.meetsTarget).length;
  const measured = weeks.filter((week) => week.completion).length;

  return (
    <SectionCard
      icon={ChartLineUpIcon}
      title="To-Do completion by week"
      description={`Share of each week's To-Dos done on time. ${onTarget} of ${measured} weeks reached the 90% target.`}
      className={className}
    >
      <div ref={ref} className="relative min-w-0">
        {isLoading || width === 0 ? (
          <Skeleton className="h-[220px] w-full rounded-xl" />
        ) : (
          <svg
            width="100%"
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`To-Do completion for the last ${weeks.length} weeks. ${onTarget} of ${measured} weeks reached 90%.`}
            className="block"
            onMouseLeave={() => setHovered(null)}
          >
            {TICKS.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  className="stroke-border"
                />
                <text
                  x={PAD.left - 8}
                  y={y(tick)}
                  dy="0.35em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
                >
                  {tick}%
                </text>
              </g>
            ))}
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(TARGET)}
              y2={y(TARGET)}
              className="stroke-ink"
              strokeWidth={1.5}
            />
            <text
              x={width - PAD.right}
              y={y(TARGET) - 6}
              textAnchor="end"
              className="fill-foreground text-[11px] font-semibold"
            >
              Target 90%
            </text>
            {hovered !== null ? (
              <line
                x1={x(hovered)}
                x2={x(hovered)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="stroke-muted-foreground/40"
              />
            ) : null}
            <path
              d={path}
              fill="none"
              className="stroke-primary"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {weeks.map((week, index) =>
              week.completion ? (
                <StatusMarker
                  key={week.weekStart}
                  status={
                    week.completion.meetsTarget
                      ? MeasurableStatus.ON_TRACK
                      : MeasurableStatus.OFF_TRACK
                  }
                  x={x(index)}
                  y={y(week.completion.ratePercent)}
                  size={hovered === index ? 6 : 5}
                />
              ) : null,
            )}
            {weeks.map((week, index) => (
              <g key={week.weekStart}>
                {(weeks.length - 1 - index) % (band < 48 ? 3 : 2) === 0 ? (
                  <text
                    x={x(index)}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {formatDate(week.weekStart)}
                  </text>
                ) : null}
                <rect
                  x={PAD.left + band * index}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHovered(index)}
                />
              </g>
            ))}
          </svg>
        )}
        {active && hovered !== null && width > 0 ? (
          <ChartTooltip leftPercent={(x(hovered) / width) * 100}>
            <p className="text-xs text-muted-foreground">{formatWeekRange(active.weekStart)}</p>
            {active.completion ? (
              <>
                <p className="font-bold tabular-nums">{active.completion.ratePercent}%</p>
                <p className="text-xs">
                  {active.completion.done} of {active.completion.due} done ·{" "}
                  {active.completion.meetsTarget ? "on target" : "below target"}
                </p>
              </>
            ) : (
              <p className="font-semibold">Nothing was due</p>
            )}
          </ChartTooltip>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <LegendItem
            swatch={
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <StatusMarker status={MeasurableStatus.ON_TRACK} x={8} y={8} />
              </svg>
            }
          >
            90% or more
          </LegendItem>
          <LegendItem
            swatch={
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <StatusMarker status={MeasurableStatus.OFF_TRACK} x={8} y={8} />
              </svg>
            }
          >
            Below 90%
          </LegendItem>
        </ul>
        <OpenLink href={sectionPath(teamId, "todos")}>Open To-Dos</OpenLink>
      </div>
    </SectionCard>
  );
}
