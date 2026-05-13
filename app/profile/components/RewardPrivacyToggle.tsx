"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RewardPrivacyToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const togglePrivacy = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save preference');
      setEnabled(!enabled);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to update privacy setting');
      console.error('Reward privacy toggle error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg font-bold">Reward privacy</p>
          <p className="text-sm text-brand-muted mt-1">
            Control whether your reward wins are visible on your public profile.
          </p>
        </div>

        <button
          type="button"
          onClick={togglePrivacy}
          disabled={isSaving}
          className="rounded-[2px] border px-4 py-2 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: enabled ? '#c2f261' : '#1f2937',
            color: enabled ? '#111827' : '#d1d5db',
            borderColor: enabled ? '#a3e635' : '#4b5563',
          }}
        >
          {isSaving ? 'Saving...' : enabled ? 'Public' : 'Private'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-status-wrong">{error}</p>}
    </div>
  );
}
