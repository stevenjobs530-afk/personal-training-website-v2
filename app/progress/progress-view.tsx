"use client";

import { useMemo, useState } from "react";
import type { AppLocale } from "@/lib/preferences-types";

export type ProgressPoint = {
  date: string;
  label: string;
  value: number;
};

export type ProgressMetricMode = "average" | "cumulative" | "sum";

export type StrengthSetSummary = {
  reps: number;
  weight: string;
};

export type StrengthProgressSummary = {
  bestSet: StrengthSetSummary | null;
};

export type ProgressItem = {
  emptyMessage: string;
  id: string;
  initial: string;
  kind: "cardio" | "strength";
  metricMode: ProgressMetricMode;
  metricLabel: string;
  name: string;
  points: ProgressPoint[];
  strengthSummary?: StrengthProgressSummary;
  unit: string;
};

type ProgressViewProps = {
  items: ProgressItem[];
  locale: AppLocale;
};

type ChartPoint = ProgressPoint & {
  observed?: boolean;
};

const timeRanges = [
  { days: 7, id: "7d", label: "1W" },
  { days: 30, id: "30d", label: "1M" },
  { days: 182, id: "182d", label: "6M" },
  { days: 365, id: "365d", label: "1Y" },
] as const;

type TimeRangeId = (typeof timeRanges)[number]["id"];

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function formatPointLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getRangeBounds(rangeId: TimeRangeId) {
  const range = timeRanges.find((item) => item.id === rangeId) ?? timeRanges[1];
  const today = new Date();
  const end = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const start = addDays(end, -(range.days - 1));

  return {
    end: getDateKey(end),
    start: getDateKey(start),
  };
}

function getVisiblePoints({
  metricMode,
  points,
  rangeId,
}: {
  metricMode: ProgressMetricMode;
  points: ProgressPoint[];
  rangeId: TimeRangeId;
}): ChartPoint[] {
  const { end, start } = getRangeBounds(rangeId);
  const startTime = parseDateKey(start);
  const endTime = parseDateKey(end);
  const visiblePoints = points.filter((point) => {
    const pointTime = parseDateKey(point.date);

    return pointTime >= startTime && pointTime <= endTime;
  });

  if (metricMode !== "cumulative") {
    return visiblePoints;
  }

  if (!visiblePoints.length) {
    return [];
  }

  let runningTotal = 0;
  const cumulativePoints: ChartPoint[] = visiblePoints.map((point) => {
    runningTotal += point.value;

    return {
      ...point,
      observed: true,
      value: runningTotal,
    };
  });
  const firstPoint = cumulativePoints[0];
  const lastPoint = cumulativePoints[cumulativePoints.length - 1];

  if (firstPoint.date !== start) {
    cumulativePoints.unshift({
      date: start,
      label: formatPointLabel(start),
      observed: false,
      value: 0,
    });
  }

  if (lastPoint.date !== end) {
    cumulativePoints.push({
      date: end,
      label: formatPointLabel(end),
      observed: false,
      value: runningTotal,
    });
  }

  return cumulativePoints;
}

function getNiceStep(value: number) {
  if (value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

function getAxisBounds(values: number[], startAtZero: boolean) {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const paddedMin = startAtZero
    ? 0
    : Math.max(
        0,
        rawMin - (rawMin === rawMax ? Math.max(rawMax * 0.2, 5) : (rawMax - rawMin) * 0.18),
      );
  const paddedMax =
    rawMin === rawMax
      ? rawMax + Math.max(rawMax * 0.2, 5)
      : rawMax + (rawMax - rawMin) * 0.18;
  const step = getNiceStep((paddedMax - paddedMin || 1) / 3);
  const min = startAtZero ? 0 : Math.max(0, Math.floor(paddedMin / step) * step);
  const max = Math.max(step, Math.ceil(paddedMax / step) * step);

  return {
    max: max === min ? min + step : max,
    min,
  };
}

function formatAxisValue(value: number) {
  if (Number.isInteger(value) || Math.abs(value) >= 100) {
    return String(Math.round(value));
  }

  return value.toFixed(1);
}

function getChartData({
  points,
  rangeId,
  startAtZero,
}: {
  points: ChartPoint[];
  rangeId: TimeRangeId;
  startAtZero: boolean;
}) {
  const width = 640;
  const height = 230;
  const padding = { bottom: 34, left: 42, right: 16, top: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const { max, min } = getAxisBounds(values, startAtZero);
  const range = max - min || 1;
  const { end, start } = getRangeBounds(rangeId);
  const startTime = parseDateKey(start);
  const timeRange = Math.max(1, parseDateKey(end) - startTime);
  const coordinates = points.map((point, index) => {
    const x =
      padding.left +
      (points.length === 1
        ? chartWidth / 2
        : ((parseDateKey(point.date) - startTime) / timeRange) * chartWidth);
    const y = padding.top + ((max - point.value) / range) * chartHeight;

    return { ...point, index, x, y };
  });

  return {
    coordinates,
    height,
    max,
    min,
    padding,
    width,
  };
}

function buildTrendPath(coordinates: ReturnType<typeof getChartData>["coordinates"]) {
  const [firstPoint, ...remainingPoints] = coordinates;

  if (!firstPoint) {
    return "";
  }

  if (coordinates.length === 2) {
    const secondPoint = coordinates[1];

    return `M ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)} L ${secondPoint.x.toFixed(1)} ${secondPoint.y.toFixed(1)}`;
  }

  return remainingPoints.reduce((path, point, index) => {
    const previousPoint = coordinates[index];
    const controlOffset = (point.x - previousPoint.x) * 0.35;

    return `${path} C ${(previousPoint.x + controlOffset).toFixed(1)} ${previousPoint.y.toFixed(1)}, ${(point.x - controlOffset).toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, `M ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)}`);
}

function TrendChart({ item }: { item: ProgressItem }) {
  const [rangeId, setRangeId] = useState<TimeRangeId>("30d");
  const metricMode = item.metricMode;
  const metricLabel = item.metricLabel;
  const unit = item.unit;
  const emptyMessage = item.emptyMessage;
  const chartPoints = item.points;
  const visiblePoints = useMemo(
    () =>
      getVisiblePoints({
        metricMode,
        points: chartPoints,
        rangeId,
      }),
    [chartPoints, metricMode, rangeId],
  );
  const controls = (
    <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
      <ChartRangeControl rangeId={rangeId} setRangeId={setRangeId} />
    </div>
  );

  if (visiblePoints.length < 2) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <h3 className="max-w-full text-sm font-black leading-5 text-[var(--foreground)] md:max-w-[16rem] lg:max-w-none">
            {metricLabel} ({unit})
          </h3>
          {controls}
        </div>
        <div className="mt-3 flex min-h-48 items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm font-semibold text-[var(--muted)]">
          {emptyMessage}
        </div>
      </div>
    );
  }

  const chart = getChartData({
    points: visiblePoints,
    rangeId,
    startAtZero: metricMode !== "average",
  });
  const trendPath = buildTrendPath(chart.coordinates);
  const labelIndexes = visiblePoints
    .map((_, index) => index)
    .filter((index) => {
      const interval = Math.max(1, Math.ceil(visiblePoints.length / 5));
      return index === 0 || index === visiblePoints.length - 1 || index % interval === 0;
    });
  const shouldShowMarkers =
    chart.coordinates.length <= 18 || metricMode !== "average";

  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <h3 className="max-w-full text-sm font-black leading-5 text-[var(--foreground)] md:max-w-[16rem] lg:max-w-none">
          {metricLabel} ({unit})
        </h3>
        {controls}
      </div>
      <svg
        aria-label={`${item.name} progress chart`}
        className="mt-3 h-auto w-full"
        role="img"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
      >
        {[0, 1, 2, 3].map((line) => {
          const y =
            chart.padding.top +
            (line / 3) * (chart.height - chart.padding.top - chart.padding.bottom);
          const value = chart.max - (line / 3) * (chart.max - chart.min);

          return (
            <g key={line}>
              <line
                stroke="var(--border)"
                strokeDasharray="3 3"
                x1={chart.padding.left}
                x2={chart.width - chart.padding.right}
                y1={y}
                y2={y}
              />
              <text
                fill="var(--muted)"
                fontSize="11"
                fontWeight="700"
                textAnchor="end"
                x={chart.padding.left - 10}
                y={y + 4}
              >
                {formatAxisValue(value)}
              </text>
            </g>
          );
        })}

        <path
          d={trendPath}
          fill="none"
          stroke="var(--accent)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {shouldShowMarkers
          ? chart.coordinates
              .filter((point) => metricMode !== "cumulative" || point.observed)
              .map((point) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="var(--accent)"
                  key={`${point.date}-${point.value}-${point.index}`}
                  r="4"
                />
              ))
          : null}

        {labelIndexes.map((index) => {
          const point = chart.coordinates[index];

          return (
            <text
              fill="var(--muted)"
              fontSize="11"
              fontWeight="700"
              key={`${point.date}-label`}
              textAnchor="middle"
              x={point.x}
              y={chart.height - 8}
            >
              {point.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ChartRangeControl({
  rangeId,
  setRangeId,
}: {
  rangeId: TimeRangeId;
  setRangeId: (rangeId: TimeRangeId) => void;
}) {
  return (
    <div className="inline-grid grid-cols-4 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
      {timeRanges.map((range) => {
        const isActive = range.id === rangeId;

        return (
          <button
            className={`min-h-8 px-3 text-xs font-black ${
              isActive
                ? "bg-[var(--accent)] text-white"
                : "bg-white text-[var(--muted)]"
            }`}
            key={range.id}
            onClick={() => setRangeId(range.id)}
            type="button"
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}

function CalculationNotes({ kind, locale }: { kind: ProgressItem["kind"]; locale: AppLocale }) {
  const notes =
    locale === "zh"
      ? kind === "strength"
        ? [["数据来源", "已记录的力量训练历史"], ["不含热身组", "热身组不会计入计算"], ["只计算工作组", "分析只使用工作组数据"], ["每日数据点", "同一天的工作组会计算为一个平均值"]]
        : [["数据来源", "已记录的有氧训练历史"], ["热量合计", "按动作和日期汇总热量"], ["累计总量", "选定期间内的热量持续累加"], ["独立记录", "有氧数据不会与力量训练组混合"]]
      : kind === "strength"
      ? [
          ["Data source", "Recorded workout history"],
          ["Warm-up sets excluded", "Warm-ups are not included in calculations"],
          ["Working sets only", "Only working sets are used for analysis"],
          [
            "Daily data point",
            "Multiple working sets on the same day are averaged into one point",
          ],
        ]
      : [
          ["Data source", "Recorded cardio history"],
          ["Kcal total", "Energy consumed is summed by exercise and date"],
          ["Running total", "Cardio adds to the selected range instead of averaging"],
          ["Separate model", "Cardio stays separate from strength workout sets"],
        ];

  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-4">
      <h3 className="text-sm font-black text-[var(--foreground)]">
        {locale === "zh" ? "进度计算方式" : "How progress is calculated"}
      </h3>
      <ul className="mt-3 space-y-3">
        {notes.map(([title, body]) => (
          <li className="grid grid-cols-[2rem_1fr] gap-3" key={title}>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-soft)] text-xs font-black text-[var(--accent-strong)]">
              {title.charAt(0)}
            </span>
            <span>
              <span className="block text-sm font-black text-[var(--foreground)]">
                {title}
              </span>
              <span className="block text-sm leading-5 text-[var(--muted)]">
                {body}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatSetSummary(value: StrengthSetSummary | null, unit: string, locale: AppLocale) {
  return value ? `${value.weight} ${unit} × ${value.reps}` : locale === "zh" ? "还没有工作组记录" : "No working sets yet";
}

function StrengthSummaryChips({
  summary,
  unit,
  locale,
}: {
  summary: StrengthProgressSummary | undefined;
  unit: string;
  locale: AppLocale;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-4 py-3">
      <p className="text-[0.68rem] font-black uppercase text-[var(--muted)]">{locale === "zh" ? "最佳训练组" : "Best set"}</p>
      <p className="mt-1 text-xl font-black text-[var(--foreground)]">{formatSetSummary(summary?.bestSet ?? null, unit, locale)}</p>
    </div>
  );
}

function ProgressPanel({ item, locale }: { item: ProgressItem; locale: AppLocale }) {
  return (
    <div className="grid gap-4 border-t border-[var(--border)] p-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
      <div className="space-y-3">
        {item.kind === "strength" ? (
          <StrengthSummaryChips locale={locale} summary={item.strengthSummary} unit={item.unit} />
        ) : null}
        <TrendChart item={item} />
      </div>
      <CalculationNotes kind={item.kind} locale={locale} />
    </div>
  );
}

function ProgressCategory({
  children,
  count,
  defaultOpen,
  description,
  icon,
  title,
}: {
  children: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  description: string;
  icon: string;
  title: string;
}) {
  return (
    <details
      className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"
      open={defaultOpen}
    >
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-base font-black text-[var(--accent-strong)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                {title}
              </h2>
              <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-[0.68rem] font-black uppercase text-[var(--muted)]">
                {count} {count === 1 ? "trend" : "trends"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
              {description}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-lg font-black text-[var(--foreground)]">
          ^
        </span>
      </summary>

      <div className="pt-4">{children}</div>
    </details>
  );
}

function ProgressItemList({
  items,
  locale,
  onItemOpenChange,
  openItemId,
}: {
  items: ProgressItem[];
  locale: AppLocale;
  onItemOpenChange: (itemId: string, isOpen: boolean) => void;
  openItemId: string | null;
}) {
  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-base leading-7 text-[var(--muted)]">
        No matching progress trends yet.
      </div>
    );
  }

  return (
    <div className="progress-tile-container">
      <section className="progress-tile-grid">
        {items.map((item) => (
          <details
            className="progress-tile"
            key={item.id}
            onToggle={(event) =>
              onItemOpenChange(item.id, event.currentTarget.open)
            }
            open={openItemId === item.id}
          >
            <summary className="progress-tile-summary">
              <span className="progress-tile-identity">
                <span className="progress-tile-initial">{item.initial}</span>
                <span className="progress-tile-name" title={item.name}>
                  {item.name}
                </span>
              </span>
              <span className="progress-tile-meta">
                <span className="progress-tile-kind">{item.kind}</span>
                <svg
                  aria-hidden="true"
                  className="progress-tile-caret"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="m5.5 7.5 4.5 4.5 4.5-4.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </span>
            </summary>
            {openItemId === item.id ? <ProgressPanel item={item} locale={locale} /> : null}
          </details>
        ))}
      </section>
    </div>
  );
}

export function ProgressView({ items, locale }: ProgressViewProps) {
  const [query, setQuery] = useState("");
  const [openItemId, setOpenItemId] = useState<string | null>(() => {
    const recent = items.map((item) => ({ id: item.id, date: item.points[item.points.length - 1]?.date ?? "" })).toSorted((a, b) => b.date.localeCompare(a.date))[0];
    return recent?.date ? recent.id : items[0]?.id ?? null;
  });
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [items, query]);
  const strengthItems = filteredItems.filter((item) => item.kind === "strength");
  const cardioItems = filteredItems.filter((item) => item.kind === "cardio");
  function handleItemOpenChange(itemId: string, isOpen: boolean) {
    setOpenItemId((currentItemId) =>
      isOpen ? itemId : currentItemId === itemId ? null : currentItemId,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <label className="sr-only" htmlFor="progress-search">
            {locale === "zh" ? "搜索训练动作进度" : "Search exercise progress"}
          </label>
          <input
            className="min-h-11 w-full rounded-md border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]"
            id="progress-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={locale === "zh" ? "搜索训练动作进度" : "Search exercise progress"}
            type="search"
            value={query}
          />
        </div>
        {openItemId ? (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-black text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            onClick={() => setOpenItemId(null)}
            type="button"
          >
            {locale === "zh" ? "收起图表" : "Collapse chart"}
          </button>
        ) : null}
      </div>

      {filteredItems.length ? (
        <section className="space-y-3">
          <ProgressCategory
            count={strengthItems.length}
            defaultOpen
            description="Strength and resistance trends based on working-set weight."
            icon="H"
            title="Strength"
          >
            <ProgressItemList
              items={strengthItems}
              locale={locale}
              onItemOpenChange={handleItemOpenChange}
              openItemId={openItemId}
            />
          </ProgressCategory>

          <ProgressCategory
            count={cardioItems.length}
            defaultOpen
            description="Cardio trends based on cumulative kcal over time."
            icon="A"
            title="Cardio"
          >
            <ProgressItemList
              items={cardioItems}
              locale={locale}
              onItemOpenChange={handleItemOpenChange}
              openItemId={openItemId}
            />
          </ProgressCategory>
        </section>
      ) : (
        <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
          No matching exercise progress yet.
        </div>
      )}
    </div>
  );
}
