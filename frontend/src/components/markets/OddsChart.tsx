import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { ProbabilitySnapshot } from '@/types';

const WINDOW_SIZE = 24;
const STABLE_POINT_INTERVAL_MS = 1000;

export const OddsChart = ({ history, outcomes }: { history: ProbabilitySnapshot[]; outcomes: string[] }) => {
  const [now, setNow] = useState(() => Date.now());
  const [followPresent, setFollowPresent] = useState(true);
  const [windowStart, setWindowStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWindow = useRef(0);

  useEffect(() => {
    // Keep the timeline moving locally without requesting new history data.
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const data = useMemo(() => {
    const toPoint = (timestamp: number, probabilities: number[], index: number) => ({
      index,
      timestamp,
      ...Object.fromEntries(outcomes.map((o, i) => [o, Math.round((probabilities[i] ?? 0) * 100)])),
    });

    const hasHistory = history && history.length > 0;
    const safeOutcomesCount = Math.max(1, outcomes.length);
    const equalProbabilities = Array.from({ length: safeOutcomesCount }, () => 1 / safeOutcomesCount);

    const base = (hasHistory ? history : [{ recorded_at: new Date(now).toISOString(), probabilities: equalProbabilities }]).map((snapshot, index) =>
      toPoint(new Date(snapshot.recorded_at).getTime(), snapshot.probabilities, index),
    );

    if (base.length === 1) {
      const onlyPoint = base[0];

      base.unshift({
        ...onlyPoint,
        index: 0,
        timestamp: onlyPoint.timestamp - STABLE_POINT_INTERVAL_MS,
      });

      base[1] = {
        ...base[1],
        index: 1,
      };
    }

    const last = base[base.length - 1];
    if (!last) return base;

    if (now > last.timestamp) {
      const stableValues = Object.fromEntries(outcomes.map((o) => [o, last[o as keyof typeof last] as number]));

      let nextTimestamp = last.timestamp + STABLE_POINT_INTERVAL_MS;
      while (nextTimestamp <= now) {
        base.push({
          index: base.length,
          timestamp: nextTimestamp,
          ...stableValues,
        });

        nextTimestamp += STABLE_POINT_INTERVAL_MS;
      }

      if (base[base.length - 1]?.timestamp !== now) {
        base.push({
          index: base.length,
          timestamp: now,
          ...stableValues,
        });
      }
    }

    return base;
  }, [history, outcomes, now]);

  useEffect(() => {
    if (!followPresent) return;
    setWindowStart(Math.max(0, data.length - WINDOW_SIZE));
  }, [data.length, followPresent]);

  const clampedWindowStart = Math.min(windowStart, Math.max(0, data.length - WINDOW_SIZE));
  const windowEnd = Math.min(data.length, clampedWindowStart + WINDOW_SIZE);
  const visibleData = data.slice(clampedWindowStart, windowEnd);
  const lastPoint = data[data.length - 1];

  const colors = ['#5768AF', '#FFB403', '#F38B00', '#FF4D02', '#7B88C2', '#B35A2A'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Utilisez la molette ou glissez le graphe pour naviguer dans le temps.</span>
        {!followPresent && (
          <button
            type="button"
            onClick={() => {
              setFollowPresent(true);
              setWindowStart(Math.max(0, data.length - WINDOW_SIZE));
            }}
            className="px-2 py-1 rounded border border-primary/25 hover:bg-secondary"
          >
            Revenir au présent
          </button>
        )}
      </div>
      <div
        className={`relative w-full h-80 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        onMouseDown={(e) => {
          if (data.length <= WINDOW_SIZE) return;
          e.preventDefault();
          setIsDragging(true);
          setFollowPresent(false);
          dragStartX.current = e.clientX;
          dragStartWindow.current = clampedWindowStart;
        }}
        onMouseMove={(e) => {
          if (!isDragging || data.length <= WINDOW_SIZE) return;

          const maxStart = Math.max(0, data.length - WINDOW_SIZE);
          const deltaX = e.clientX - dragStartX.current;
          const stepDelta = Math.round(deltaX / 24);
          const next = Math.min(Math.max(0, dragStartWindow.current - stepDelta), maxStart);

          setWindowStart(next);
          setFollowPresent(next >= maxStart);
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onWheel={(e) => {
          if (data.length <= WINDOW_SIZE) return;
          e.preventDefault();

          const direction = e.deltaY > 0 ? -1 : 1;
          const next = Math.min(
            Math.max(0, clampedWindowStart + direction),
            Math.max(0, data.length - WINDOW_SIZE),
          );

          setWindowStart(next);
          setFollowPresent(next >= Math.max(0, data.length - WINDOW_SIZE));
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d7ddf3" />
            <XAxis
              dataKey="index"
              stroke="#606682"
              tickFormatter={(value) => {
                const point = data[Number(value)];
                return point ? new Date(point.timestamp).toLocaleTimeString() : '';
              }}
            />
            <YAxis domain={[0, 100]} stroke="#606682" label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value) => `${value}%`}
              labelFormatter={(value) => {
                const point = data[Number(value)];
                return point ? new Date(point.timestamp).toLocaleString() : '';
              }}
            />
            <Legend />
            {lastPoint && (
              <ReferenceLine
                x={lastPoint.index}
                stroke="#F38B00"
                strokeDasharray="4 4"
                label={{ value: 'Présent', position: 'top', fill: '#F38B00' }}
              />
            )}
            {outcomes.map((outcome, index) => (
              <Line
                key={outcome}
                type="monotone"
                dataKey={outcome}
                stroke={colors[index % colors.length]}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
