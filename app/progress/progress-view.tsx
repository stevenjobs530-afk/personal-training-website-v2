"use client";

import { useMemo, useState } from "react";

export type ProgressPoint = {
  date: string;
  label: string;
  value: number;
};

export type ProgressItem = {
  emptyMessage: string;
  id: string;
  initial: string;
  kind: "cardio" | "strength";
  metricMode: "average" | "cumulative";
  metricLabel: string;
  name: string;
  points: ProgressPoint[];
  unit: string;
};

type ProgressViewProps = {
  items: ProgressItem[];
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

function getVisiblePoints(item: ProgressItem, rangeId: TimeRangeId): ChartPoint[] {
  const { end, start } = getRangeBounds(rangeId);
  const startTime = parseDateKey(start);
  const endTime = parseDateKey(end);
  const points = item.points.filter((point) => {
    const pointTime = parseDateKey(point.date);

    return pointTime >= startTime && pointTime <= endTime;
  });

  if (item.metricMode === "average") {
    return points;
  }

  if (!points.length) {
    return [];
  }

  let runningTotal = 0;
  const cumulativePoints: ChartPoint[] = points.map((point) => {
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
  const visiblePoints = useMemo(
    () => getVisiblePoints(item, rangeId),
    [item, rangeId],
  );

  if (visiblePoints.length < 2) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-white p-4">
        <ChartRangeControl rangeId={rangeId} setRangeId={setRangeId} />
        <div className="mt-3 flex min-h-48 items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm font-semibold text-[var(--muted)]">
          {item.emptyMessage}
        </div>
      </div>
    );
  }

  const chart = getChartData({
    points: visiblePoints,
    rangeId,
    startAtZero: item.metricMode === "cumulative",
  });
  const trendPath = buildTrendPath(chart.coordinates);
  const labelIndexes = visiblePoints
    .map((_, index) => index)
    .filter((index) => {
      const interval = Math.max(1, Math.ceil(visiblePoints.length / 5));
      return index === 0 || index === visiblePoints.length - 1 || index % interval === 0;
    });
  const shouldShowMarkers =
    chart.coordinates.length <= 18 || item.metricMode === "cumulative";

  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-sm font-black text-[var(--foreground)]">
          {item.metricLabel} ({item.unit})
        </h3>
        <ChartRangeControl rangeId={rangeId} setRangeId={setRangeId} />
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
              .filter((point) => item.metricMode === "average" || point.observed)
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

function CalculationNotes({ kind }: { kind: ProgressItem["kind"] }) {
  const notes =
    kind === "strength"
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
        How progress is calculated
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

function ProgressPanel({ item }: { item: ProgressItem }) {
  return (
    <div className="grid gap-4 border-t border-[var(--border)] p-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
      <TrendChart item={item} />
      <CalculationNotes kind={item.kind} />
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

function ProgressItemList({ items }: { items: ProgressItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-base leading-7 text-[var(--muted)]">
        No matching progress trends yet.
      </div>
    );
  }

  return (
    <section className="space-y-2">
      {items.map((item, index) => (
        <details
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-sm"
          key={item.id}
          open={index === 0}
        >
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-sm font-black text-[var(--accent-strong)]">
                {item.initial}
              </span>
              <span className="truncate text-base font-black text-[var(--foreground)]">
                {item.name}
              </span>
            </div>
            <span className="shrink-0 rounded-md bg-[var(--surface-strong)] px-2 py-1 text-[0.68rem] font-black uppercase text-[var(--muted)]">
              {item.kind}
            </span>
          </summary>
          <ProgressPanel item={item} />
        </details>
      ))}
    </section>
  );
}

export function ProgressView({ items }: ProgressViewProps) {
  const [query, setQuery] = useState("");
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [items, query]);
  const strengthItems = filteredItems.filter((item) => item.kind === "strength");
  const cardioItems = filteredItems.filter((item) => item.kind === "cardio");

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <label className="sr-only" htmlFor="progress-search">
          Search exercise progress
        </label>
        <input
          className="min-h-11 w-full rounded-md border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]"
          id="progress-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercise progress"
          type="search"
          value={query}
        />
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
            <ProgressItemList items={strengthItems} />
          </ProgressCategory>

          <ProgressCategory
            count={cardioItems.length}
            defaultOpen
            description="Cardio trends based on cumulative kcal over time."
            icon="A"
            title="Cardio"
          >
            <ProgressItemList items={cardioItems} />
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
