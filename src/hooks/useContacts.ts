import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCommunityContacts, getMyContacts } from '../services/contactsService';
import type { Contact } from '../types';

export const useContacts = () => {
  const { user } = useAuth();
  const [myContacts, setMyContacts] = useState<Contact[]>([]);
  const [communityContacts, setCommunityContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const [mine, community] = await Promise.all([
        getMyContacts(user.uid),
        getCommunityContacts(),
      ]);
      setMyContacts(mine);
      setCommunityContacts(community);
    } catch (loadError) {
      console.error('Failed to load contacts:', loadError);
      setError('Unable to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { myContacts, communityContacts, loading, error, refresh };
};
