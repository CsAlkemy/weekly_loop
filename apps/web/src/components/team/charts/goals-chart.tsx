import { useId, useState } from "react";

import { ChartBarIcon } from "@phosphor-icons/react";

import { formatDate, formatWeekRange, MeasurableStatus } from "@repo/library";
import { cn, Pill, SectionCard, Skeleton } from "@repo/ui";

import { ChartTooltip, LegendItem } from "@/components/charts/chart-tooltip";
import { OpenLink } from "@/components/team/team-overview";
import { useElementWidth } from "@/hooks/use-element-width";
import { useScorecard } from "@/hooks/use-scorecard";
import { niceScale, roundedTop } from "@/lib/chart-scale";
import { sectionPath } from "@/lib/navigation";

const HEIGHT = 240;
const PAD = { top: 12, right: 8, bottom: 28, left: 32 };
const GAP = 2;

export function GoalsChart({ teamId, className }: { teamId: string; className?: string }) {
  const { data: scorecard, isLoading } = useScorecard(teamId);
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const stripes = useId();

  const weeks = (scorecard?.weeks ?? []).map((week) => {
    const statuses = (scorecard?.measurables ?? []).map(
      (measurable) => measurable.cells.find((cell) => cell.weekStart === week)?.status,
    );
    const count = (status: MeasurableStatus) => statuses.filter((item) => item === status).length;
    return {
      week,
      met: count(MeasurableStatus.ON_TRACK),
      missed: count(MeasurableStatus.OFF_TRACK),
      pending: count(MeasurableStatus.PENDING),
    };
  });
  const total = scorecard?.measurables.length ?? 0;
  const lastWeek = weeks.find((item) => item.week === scorecard?.lastClosedWeek);

  const { max, ticks } = niceScale(total, { integer: true });
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const band = weeks.length ? plotW / weeks.length : 0;
  const barWidth = Math.min(24, band * 0.55);
  const active = hovered === null ? null : weeks[hovered];

  return (
    <SectionCard
      icon={ChartBarIcon}
      title="Goals met each week"
      description="Each column is a week of the Scorecard. Green parts reached their goal."
      action={
        lastWeek ? (
          <Pill
            tone={lastWeek.met === total ? "success" : "warning"}
            className="px-3 py-1.5 text-sm"
          >
            Last week: {lastWeek.met} of {total} met
          </Pill>
        ) : null
      }
      className={className}
    >
      <div ref={ref} className="relative min-w-0">
        {isLoading || width === 0 ? (
          <Skeleton className="h-[240px] w-full rounded-xl" />
        ) : (
          <svg
            width="100%"
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Goals met per week for the last ${weeks.length} weeks. Last week ${lastWeek?.met ?? 0} of ${total} met.`}
            className="block"
            onMouseLeave={() => setHovered(null)}
          >
            <defs>
              <pattern
                id={stripes}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" className="fill-destructive" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke="white"
                  strokeOpacity="0.45"
                  strokeWidth="2.5"
                />
              </pattern>
            </defs>
            {ticks.map((tick) => (
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
                  {tick}
                </text>
              </g>
            ))}
            {weeks.map((item, index) => {
              const x = PAD.left + band * index + (band - barWidth) / 2;
              const parts = [
                { value: item.met, fill: "fill-success" },
                { value: item.missed, fill: `url(#${stripes})` },
                { value: item.pending, fill: "fill-muted-foreground/25" },
              ].filter((part) => part.value > 0);
              let base = 0;

              return (
                <g key={item.week}>
                  {hovered === index ? (
                    <rect
                      x={PAD.left + band * index}
                      y={PAD.top}
                      width={band}
                      height={plotH}
                      className="fill-muted"
                    />
                  ) : null}
                  {parts.map((part, partIndex) => {
                    const top = y(base + part.value);
                    const height = y(base) - top - (partIndex < parts.length - 1 ? GAP : 0);
                    const isTop = partIndex === parts.length - 1;
                    const shape = isTop
                      ? roundedTop(x, top, barWidth, height)
                      : `M${x},${top}h${barWidth}v${height}h${-barWidth}Z`;
                    base += part.value;
                    return part.fill.startsWith("url") ? (
                      <path key={part.fill} d={shape} fill={part.fill} />
                    ) : (
                      <path key={part.fill} d={shape} className={part.fill} />
                    );
                  })}
                  {(weeks.length - 1 - index) % (band < 48 ? 3 : 2) === 0 ? (
                    <text
                      x={x + barWidth / 2}
                      y={HEIGHT - 8}
                      textAnchor="middle"
                      className={cn(
                        "text-[11px]",
                        item.week === scorecard?.lastClosedWeek
                          ? "fill-primary font-semibold"
                          : "fill-muted-foreground",
                      )}
                    >
                      {formatDate(item.week)}
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
              );
            })}
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(0)}
              y2={y(0)}
              className="stroke-input"
            />
          </svg>
        )}
        {active && hovered !== null && width > 0 ? (
          <ChartTooltip leftPercent={((PAD.left + band * (hovered + 0.5)) / width) * 100}>
            <p className="text-xs text-muted-foreground">{formatWeekRange(active.week)}</p>
            <p className="font-semibold">
              {active.met} met · {active.missed} missed
            </p>
            {active.pending ? <p className="text-xs">{active.pending} not entered</p> : null}
          </ChartTooltip>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <LegendItem swatch={<span className="size-3.5 rounded bg-success" />}>
            Goal met
          </LegendItem>
          <LegendItem
            swatch={
              <svg viewBox="0 0 14 14" className="size-3.5 rounded" aria-hidden>
                <rect width="14" height="14" fill={`url(#${stripes})`} />
              </svg>
            }
          >
            Goal missed
          </LegendItem>
          <LegendItem swatch={<span className="size-3.5 rounded bg-muted-foreground/25" />}>
            Not entered
          </LegendItem>
        </ul>
        <OpenLink href={sectionPath(teamId, "scorecard")}>Open Scorecard</OpenLink>
      </div>
    </SectionCard>
  );
}
