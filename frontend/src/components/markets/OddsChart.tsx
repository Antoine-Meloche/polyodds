import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProbabilitySnapshot } from '@/types';

export const OddsChart = ({ history, outcomes }: { history: ProbabilitySnapshot[]; outcomes: string[] }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Keep the timeline moving locally without requesting new history data.
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (!history || history.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No history data available</div>;
  }

  const data = useMemo(() => {
    const base = history.map((snapshot) => ({
      time: new Date(snapshot.recorded_at).toLocaleTimeString(),
      timestamp: new Date(snapshot.recorded_at).getTime(),
      ...Object.fromEntries(outcomes.map((o, i) => [o, Math.round(snapshot.probabilities[i] * 100)])),
    }));

    const last = history[history.length - 1];
    if (!last) return base;

    const lastTs = new Date(last.recorded_at).getTime();
    if (now > lastTs) {
      base.push({
        time: new Date(now).toLocaleTimeString(),
        timestamp: now,
        ...Object.fromEntries(outcomes.map((o, i) => [o, Math.round(last.probabilities[i] * 100)])),
      });
    }

    return base;
  }, [history, outcomes, now]);

  const colors = ['#5768AF', '#FFB403', '#F38B00', '#FF4D02', '#7B88C2', '#B35A2A'];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7ddf3" />
          <XAxis dataKey="time" stroke="#606682" />
          <YAxis domain={[0, 100]} stroke="#606682" label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          {outcomes.map((outcome, index) => (
            <Line
              key={outcome}
              type="monotone"
              dataKey={outcome}
              stroke={colors[index % colors.length]}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
