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
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <GiftIcon className="animate-bounce text-amber-700" />
        <div>
          <p className="font-semibold text-amber-900">Daily Bonus Available!</p>
          <p className="text-sm text-amber-800">Claim 100 points now</p>
        </div>
      </div>
      <button
        onClick={() => claim()}
        disabled={isPending}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
      >
        {isPending ? 'Claiming...' : 'Claim'}
      </button>
    </div>
  );
};
