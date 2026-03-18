import { useState } from 'react';
import type { MarketWithPools } from '@/types';
import { useBet } from '@/hooks/useBet';
import { formatProbability, formatPayout } from '@/utils/odds';

export const BetPanel = ({ market }: { market: MarketWithPools }) => {
  const [amount, setAmount] = useState<number>(10);
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0);
  const { placeBet, isPending, error } = useBet();

  if (market.status !== 'open') {
    return (
      <div className="border rounded-lg p-4 bg-card">
        <p className="text-center text-muted-foreground">This market is {market.status}</p>
      </div>
    );
  }

  const pool = market.pools[selectedOutcome];
  const probability = pool?.probability || 0;

  const handleBet = () => {
    if (!amount || amount <= 0) return;
    placeBet({ market_id: market.id, outcome_index: selectedOutcome, amount });
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <h3 className="font-semibold">Place a Bet</h3>

      {/* Outcome Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Outcome</label>
        <div className="flex gap-2 flex-wrap">
          {market.outcomes.map((outcome, index) => (
            <button
              key={index}
              onClick={() => setSelectedOutcome(index)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedOutcome === index
                  ? 'ring-2 ring-primary bg-primary text-primary-foreground'
                  : 'border hover:border-primary'
              }`}
            >
              {outcome}
            </button>
          ))}
        </div>
      </div>

      {/* Probability & Pool Info */}
      <div className="bg-secondary p-3 rounded-lg space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Current Probability:</span>
          <span className="font-semibold">{formatProbability(probability)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pool Size:</span>
          <span className="font-semibold">{pool?.total_points || 0}</span>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount (points)</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Enter amount"
        />
      </div>

      {/* Payout Preview */}
      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Potential Payout:</span>
          <span className="font-semibold text-green-700 dark:text-green-300">
            {formatPayout(amount, probability)}
          </span>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{(error as any).message}</div>}

      {/* Submit Button */}
      <button
        onClick={handleBet}
        disabled={isPending || !amount || amount <= 0}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
      >
        {isPending ? 'Placing Bet...' : 'Place Bet'}
      </button>
    </div>
  );
};
