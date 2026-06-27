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
  metricLabel: string;
  name: string;
  points: ProgressPoint[];
  unit: string;
};

type ProgressViewProps = {
  items: ProgressItem[];
};

function getChartData(points: ProgressPoint[]) {
  const width = 640;
  const height = 230;
  const padding = { bottom: 34, left: 42, right: 16, top: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = rawMin === rawMax ? Math.max(rawMax * 0.2, 5) : (rawMax - rawMin) * 0.18;
  const min = Math.max(0, Math.floor(rawMin - pad));
  const max = Math.ceil(rawMax + pad);
  const range = max - min || 1;
  const coordinates = points.map((point, index) => {
    const x =
      padding.left +
      (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
    const y = padding.top + ((max - point.value) / range) * chartHeight;

    return { ...point, x, y };
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

function TrendChart({ item }: { item: ProgressItem }) {
  if (item.points.length < 2) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-md border border-[var(--border)] bg-white p-6 text-center text-sm font-semibold text-[var(--muted)]">
        {item.emptyMessage}
      </div>
    );
  }

  const chart = getChartData(item.points);
  const polyline = chart.coordinates
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const labelIndexes = item.points
    .map((_, index) => index)
    .filter((index) => {
      const interval = Math.max(1, Math.ceil(item.points.length / 5));
      return index === 0 || index === item.points.length - 1 || index % interval === 0;
    });

  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-4">
      <h3 className="text-sm font-black text-[var(--foreground)]">
        {item.metricLabel} ({item.unit})
      </h3>
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
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        <polyline
          fill="none"
          points={polyline}
          stroke="var(--accent)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {chart.coordinates.map((point) => (
          <circle
            cx={point.x}
            cy={point.y}
            fill="var(--accent)"
            key={`${point.date}-${point.value}`}
            r="4"
          />
        ))}

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
          ["Kcal trend", "Energy consumed is averaged by exercise and date"],
          ["Daily data point", "Multiple entries on the same day become one point"],
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

export function ProgressView({ items }: ProgressViewProps) {
  const [query, setQuery] = useState("");
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [items, query]);

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
        <section className="space-y-2">
          {filteredItems.map((item, index) => (
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
      ) : (
        <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
          No matching exercise progress yet.
        </div>
      )}
    </div>
  );
}
