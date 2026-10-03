import React, { useEffect, useState } from 'react';
import { getAppSettings, setAutoApproveMembers } from '../services/organizerService';

export const AutoApproveMembersToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getAppSettings()
      .then((settings) => {
        if (isMounted) setEnabled(settings?.autoApproveMembers === true);
      })
      .catch(() => {
        if (isMounted) setError('Unable to load the auto-approval setting.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSetting = async (nextEnabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await setAutoApproveMembers(nextEnabled);
      setEnabled(nextEnabled);
    } catch {
      setError('Unable to update the auto-approval setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-text">Auto-approve new students</p>
          <p className="mt-1 text-sm text-muted">New student signups skip member approval when enabled. Existing pending members are unchanged.</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-text">
          <input
            type="checkbox"
            checked={enabled}
            disabled={loading || saving}
            onChange={(event) => void updateSetting(event.target.checked)}
            aria-label="Auto-approve new students"
          />
          {loading ? 'Loading' : saving ? 'Saving' : enabled ? 'On' : 'Off'}
        </label>
      </div>
      {error && <p className="text-sm text-error" role="alert">{error}</p>}
    </div>
  );
};