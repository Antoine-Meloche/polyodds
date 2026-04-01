import { useDailyClaim } from '@/hooks/useDailyClaim';
import { useAuth } from '@/hooks/useAuth';
import { GiftIcon } from '@/components/shared/icons';

export const DailyClaimBanner = () => {
  const { user } = useAuth();
  const { claim, isPending } = useDailyClaim();

  if (!user) return null;

  const canClaim = !user.last_claim_at || new Date() >= new Date(new Date(user.last_claim_at).getTime() + 24 * 60 * 60 * 1000);

  if (!canClaim) return null;

  return (
    <div className="rounded-lg p-4 flex items-center justify-between bg-gradient-to-r from-primary/10 via-secondary to-accent/15 border border-primary/20 shadow-[0_16px_30px_rgba(87,104,175,0.12)]">
      <div className="flex items-center gap-3">
        <GiftIcon className="animate-bounce text-accent" />
        <div>
          <p className="font-semibold text-foreground">Bonus quotidien disponible!</p>
          <p className="text-sm text-muted-foreground">Réclamez 100 points maintenant</p>
        </div>
      </div>
      <button
        onClick={() => claim()}
        disabled={isPending}
        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:brightness-95 disabled:opacity-50 font-semibold"
      >
        {isPending ? 'Réclamation en cours...' : 'Réclamer'}
      </button>
    </div>
  );
};
