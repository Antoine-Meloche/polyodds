import { useState } from 'react';
import type { MarketWithPools } from '@/types';
import { useBet } from '@/hooks/useBet';
import { useAuth } from '@/hooks/useAuth';
import { formatProbability } from '@/utils/odds';

export const BetPanel = ({ market }: { market: MarketWithPools }) => {
  const [amount, setAmount] = useState<number>(10);
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const { user } = useAuth();
  const { placeBet, isPending, errorMessage } = useBet();
  const isCreator = !!user && user.id === market.creator_id;

  if (market.status !== 'open') {
    return (
      <div className="app-panel p-4">
        <p className="text-center text-muted-foreground">Ce marché est {market.status}</p>
      </div>
    );
  }

  if (isCreator) {
    return (
      <div className="app-panel p-4">
        <p className="text-center text-muted-foreground">
          En tant que créateur du marché, vous ne pouvez pas placer une mise sur votre propre marché.
        </p>
      </div>
    );
  }

  const pool = market.pools[selectedOutcome];
  const probability = pool?.probability || 0;
  const totalPoolPoints = market.pools.reduce((acc, p) => acc + p.total_points, 0);
  const basePrice = totalPoolPoints > 0 ? (pool?.total_points || 0) / totalPoolPoints : 0;
  const spread = 0.015;
  const impact = totalPoolPoints > 0 ? amount / totalPoolPoints : 0;
  const askPrice = Math.max(0.01, basePrice * (1 + spread / 2 + impact));
  const bidPrice = Math.max(0.01, basePrice * (1 - spread / 2 - impact));
  const estimatedShares = side === 'buy' ? Math.floor(amount / askPrice) : amount;
  const estimatedPayout = side === 'sell' ? Math.floor(amount * bidPrice) : amount;
  const availablePoints = user?.points ?? 0;
  const availableShares =
    market.user_position && market.user_position.outcome_index === selectedOutcome
      ? market.user_position.shares
      : 0;
  const exceedsBalance = !!user && amount > availablePoints;
  const exceedsShares = amount > availableShares;
  const tooSmallTrade = side === 'buy' ? estimatedShares <= 0 : estimatedPayout <= 0;

  const handleBet = () => {
    if (!amount || amount <= 0) return;
    if (side === 'buy' && exceedsBalance) return;
    if (side === 'sell' && exceedsShares) return;
    if (tooSmallTrade) return;
    placeBet({ market_id: market.id, outcome_index: selectedOutcome, amount, side });
  };

  return (
    <div className="app-panel p-4 space-y-4">
      <h3 className="font-semibold">Placer une mise</h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            side === 'buy' ? 'bg-primary text-primary-foreground border-primary' : 'border-primary/25'
          }`}
        >
          Acheter des shares
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            side === 'sell' ? 'bg-primary text-primary-foreground border-primary' : 'border-primary/25'
          }`}
        >
          Vendre des shares
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Sélectionnez le résultat</label>
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

      <div className="bg-secondary p-3 rounded-lg space-y-2 text-sm border border-primary/20">
        <div className="flex justify-between">
          <span>Probabilité actuelle:</span>
          <span className="font-semibold">{formatProbability(probability)}</span>
        </div>
        <div className="flex justify-between">
          <span>Taille du bassin:</span>
          <span className="font-semibold">{pool?.total_points || 0}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Montant (points)</label>
        <input
          type="number"
          min="1"
          max={side === 'buy' ? user?.points : availableShares}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Entrez le montant"
        />
        {user && side === 'buy' && (
          <p className="text-xs text-muted-foreground">Disponible: {availablePoints} points</p>
        )}
        {user && side === 'sell' && (
          <p className="text-xs text-muted-foreground">Shares disponibles sur ce résultat: {availableShares}</p>
        )}
      </div>

      <div className="bg-accent/16 p-3 rounded-lg space-y-2 text-sm border border-accent/30">
        <div className="flex justify-between">
          <span>{side === 'buy' ? 'Shares estimées:' : 'Retour estimé:'}</span>
          <span className="font-semibold text-accent-foreground">
            {side === 'buy' ? `${estimatedShares}` : `${estimatedPayout} points`}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Prix estimé:</span>
          <span className="font-semibold text-accent-foreground">
            {(side === 'buy' ? askPrice : bidPrice).toFixed(3)}
          </span>
        </div>
      </div>

      {side === 'buy' && exceedsBalance && (
        <div className="text-destructive text-sm">Vous n'avez pas assez de points pour cette mise.</div>
      )}

      {side === 'sell' && exceedsShares && (
        <div className="text-destructive text-sm">Vous n'avez pas assez de shares pour vendre ce montant.</div>
      )}

      {tooSmallTrade && (
        <div className="text-destructive text-sm">Montant trop faible pour exécuter la transaction au prix actuel.</div>
      )}

      {errorMessage && !(side === 'buy' && exceedsBalance) && !(side === 'sell' && exceedsShares) && !tooSmallTrade && (
        <div className="text-destructive text-sm">{errorMessage}</div>
      )}

      <button
        onClick={handleBet}
        disabled={isPending || !amount || amount <= 0 || tooSmallTrade || (side === 'buy' ? exceedsBalance : exceedsShares)}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
      >
        {isPending ? 'Transaction en cours...' : side === 'buy' ? "Confirmer l'achat" : 'Confirmer la vente'}
      </button>
    </div>
  );
};
