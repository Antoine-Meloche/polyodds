import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProbabilitySnapshot } from '@/types';

type Timeframe = '1H' | '6H' | '1D' | '1W' | 'All';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string; hours: number | null }[] = [
  { value: '1H', label: '1H', hours: 1 },
  { value: '6H', label: '6H', hours: 6 },
  { value: '1D', label: '1D', hours: 24 },
  { value: '1W', label: '1W', hours: 168 },
  { value: 'All', label: 'All', hours: null },
];

export const OddsChart = ({ history, outcomes }: { history: ProbabilitySnapshot[]; outcomes: string[] }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const INTERVAL_MS = 30 * 1000; // 30 seconds
    const interval = setInterval(() => setNow(Date.now()), INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const data = useMemo(() => {
    if (!history || history.length === 0) {
      return [];
    }

    const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe);
    const INTERVAL_MS = 30 * 1000; // 30 seconds
    
    let cutoffTime = 0;
    if (timeframeOption && timeframeOption.hours !== null) {
      cutoffTime = now - (timeframeOption.hours * 60 * 60 * 1000);
    }

    const filtered = history.filter(snapshot => {
      const snapshotTime = new Date(snapshot.recorded_at).getTime();
      if (cutoffTime === 0) return true;
      return snapshotTime >= cutoffTime;
    });

    if (filtered.length === 0) {
      return [];
    }

    const basePoints = filtered.map((snapshot) => ({
      timestamp: new Date(snapshot.recorded_at).getTime(),
      displayTime: new Date(snapshot.recorded_at).toISOString(),
      probabilities: outcomes.map((_, i) => snapshot.probabilities[i] ?? 0),
    }));

    const filledData = [...basePoints];

    const lastPoint = filledData[filledData.length - 1];
    if (lastPoint && lastPoint.timestamp < now) {
      const timeDiff = now - lastPoint.timestamp;
      const numIntervals = Math.floor(timeDiff / INTERVAL_MS);

      for (let j = 1; j <= numIntervals; j++) {
        const extendedTime = lastPoint.timestamp + j * INTERVAL_MS;
        if (extendedTime <= now) {
          filledData.push({
            timestamp: extendedTime,
            displayTime: new Date(extendedTime).toISOString(),
            probabilities: lastPoint.probabilities,
          });
        }
      }
    }

    return filledData.map((point, index) => ({
      index,
      timestamp: point.timestamp,
      displayTime: point.displayTime,
      ...Object.fromEntries(
        outcomes.map((o, i) => [o, Math.round((point.probabilities[i] ?? 0) * 100)])
      ),
    }));
  }, [history, outcomes, selectedTimeframe, now]);

  const colors = ['#5768AF', '#FFB403', '#F38B00', '#FF4D02', '#7B88C2', '#B35A2A'];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {TIMEFRAME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedTimeframe(option.value)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              selectedTimeframe === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="w-full h-80">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7ddf3" />
              <XAxis
                type="number"
                dataKey="index"
                domain={[0, 'dataMax']}
                stroke="#606682"
                tick={{ fontSize: 12 }}
                tickFormatter={(index) => {
                  if (index == null || !data?.[Number(index)]) return '';
                  const time = new Date(data[Number(index)].timestamp);
                  const isAllTime = selectedTimeframe === 'All';
                  const is1Week = selectedTimeframe === '1W';

                  if (isAllTime || is1Week) {
                    return time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }
                  return time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                }}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#606682"
                tick={{ fontSize: 12 }}
                label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip
                formatter={(value) => `${value}%`}
                labelFormatter={(label) => {
                  if (label == null || !data) return '';

                  let date: Date | null = null;

                  if (typeof label === 'number') {
                    const point = data[label];
                    if (point?.timestamp !== undefined) {
                      date = new Date(point.timestamp);
                    }
                  } else if (typeof label === 'string') {
                    const maybeDate = new Date(label);
                    if (!Number.isNaN(maybeDate.getTime())) {
                      date = maybeDate;
                    }
                  }

                  if (!date) return '';
                  const isAllTime = selectedTimeframe === 'All';
                  const is1Week = selectedTimeframe === '1W';

                  if (isAllTime || is1Week) {
                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  }
                  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                }}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #d7ddf3',
                  borderRadius: '4px',
                  padding: '8px'
                }}
              />
              <Legend />
              {outcomes.map((outcome, index) => (
                <Line
                  key={outcome}
                  type="stepAfter"
                  dataKey={outcome}
                  stroke={colors[index % colors.length]}
                  dot={false}
                  isAnimationActive={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No data available for this timeframe
          </div>
        )}
      </div>
    </div>
  );
};
