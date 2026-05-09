/**
 * GitHub-style activity heatmap — fully responsive.
 *
 * On large screens renders 52 weeks. On smaller screens it
 * automatically reduces the number of visible weeks to fit the
 * available container width, using a ResizeObserver. Cell sizes
 * stay readable at every breakpoint.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityDayResponse } from "@/types/stats";

interface ActivityHeatmapProps {
  days: ActivityDayResponse[];
  totalLessons: number;
}

const MAX_WEEKS = 52;
const CELL_SIZE = 12;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LABEL_WIDTH = 28;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getColor(count: number, max: number): string {
  if (count === 0) return "var(--color-heatmap-0)";
  const ratio = max > 0 ? count / max : 0;
  if (ratio <= 0.25) return "var(--color-heatmap-1)";
  if (ratio <= 0.5) return "var(--color-heatmap-2)";
  if (ratio <= 0.75) return "var(--color-heatmap-3)";
  return "var(--color-heatmap-4)";
}

function computeWeeksForWidth(containerWidth: number): number {
  const available = containerWidth - LABEL_WIDTH - 8; // 8px padding
  const weeks = Math.max(10, Math.floor(available / CELL_STEP));
  return Math.min(weeks, MAX_WEEKS);
}

function getMonthLabels(startDate: Date, weeks: number): { label: string; x: number }[] {
  const labels: { label: string; x: number }[] = [];
  let lastMonth = -1;

  for (let week = 0; week < weeks; week++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + week * 7);
    if (d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      labels.push({
        label: MONTH_NAMES[lastMonth],
        x: LABEL_WIDTH + week * CELL_STEP,
      });
    }
  }
  return labels;
}

export function ActivityHeatmap({ days, totalLessons }: ActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleWeeks, setVisibleWeeks] = useState(MAX_WEEKS);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Measure container width and recalculate visible weeks
  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    setVisibleWeeks(computeWeeksForWidth(width));
  }, []);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const { grid, maxCount, startDate } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (visibleWeeks - 1) * 7 - start.getDay());

    const dayMap = new Map<string, number>();
    let max = 0;
    for (const d of days) {
      dayMap.set(d.date, d.count);
      if (d.count > max) max = d.count;
    }

    const cells: {
      date: string;
      count: number;
      weekIdx: number;
      dayIdx: number;
    }[] = [];

    for (let week = 0; week < visibleWeeks; week++) {
      for (let day = 0; day < 7; day++) {
        const d = new Date(start);
        d.setDate(d.getDate() + week * 7 + day);
        if (d > today) continue;
        const key = d.toISOString().slice(0, 10);
        cells.push({
          date: key,
          count: dayMap.get(key) ?? 0,
          weekIdx: week,
          dayIdx: day,
        });
      }
    }

    return { grid: cells, maxCount: max, startDate: start };
  }, [days, visibleWeeks]);

  const monthLabels = useMemo(
    () => getMonthLabels(startDate, visibleWeeks),
    [startDate, visibleWeeks],
  );

  const svgWidth = LABEL_WIDTH + visibleWeeks * CELL_STEP;
  const svgHeight = 7 * CELL_STEP + 24;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>
              {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"} in the last{" "}
              {visibleWeeks === MAX_WEEKS ? "year" : `${visibleWeeks} weeks`}
            </CardDescription>
          </div>
          {/* Legend */}
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="size-3 rounded-[3px]"
                style={{ backgroundColor: `var(--color-heatmap-${level})` }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardHeader>

      <CardContent ref={containerRef}>
        <svg
          width={svgWidth}
          height={svgHeight}
          className="mx-auto block max-w-full select-none"
          role="img"
          aria-label="Activity heatmap showing lesson completions"
        >
          {/* Month labels */}
          {monthLabels.map((m) => (
            <text
              key={`${m.label}-${m.x}`}
              x={m.x}
              y={10}
              className="fill-muted-foreground text-[10px]"
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={`day-${i}`}
                x={0}
                y={20 + i * CELL_STEP + CELL_SIZE / 2 + 3}
                className="fill-muted-foreground text-[10px]"
              >
                {label}
              </text>
            ) : null,
          )}

          {/* Cells */}
          {grid.map((cell) => (
            <rect
              key={cell.date}
              x={LABEL_WIDTH + cell.weekIdx * CELL_STEP}
              y={20 + cell.dayIdx * CELL_STEP}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={3}
              fill={getColor(cell.count, maxCount)}
              className="cursor-pointer transition-opacity hover:opacity-75"
              onMouseEnter={(e) => {
                const formatted = new Date(cell.date + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                setTooltip({
                  text:
                    cell.count === 0
                      ? `No lessons on ${formatted}`
                      : `${cell.count} ${cell.count === 1 ? "lesson" : "lessons"} on ${formatted}`,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>
      </CardContent>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="bg-popover text-popover-foreground ring-border pointer-events-none fixed z-50 rounded-md px-2.5 py-1.5 text-xs font-medium shadow-lg ring-1"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}
    </Card>
  );
}
