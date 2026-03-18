import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProbabilitySnapshot } from '@/types';

export const OddsChart = ({ history, outcomes }: { history: ProbabilitySnapshot[]; outcomes: string[] }) => {
  if (!history || history.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No history data available</div>;
  }

  const data = history.map((snapshot) => ({
    time: new Date(snapshot.recorded_at).toLocaleTimeString(),
    ...Object.fromEntries(outcomes.map((o, i) => [o, Math.round(snapshot.probabilities[i] * 100)])),
  }));

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#a855f7', '#f59e0b', '#ec4899'];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }} />
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
