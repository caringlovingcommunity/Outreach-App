import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCommunityContacts, getFilteredContacts, getMyContacts, subscribeToContacts } from '../services/contactsService';
import type { Contact } from '../types';

export const useContacts = () => {
  const { user } = useAuth();
  const [myContacts, setMyContacts] = useState<Contact[]>([]);
  const [communityContacts, setCommunityContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const [mine, community, filtered] = await Promise.all([
        getMyContacts(user.uid),
        getCommunityContacts(),
        getFilteredContacts(user.uid),
      ]);
      setMyContacts(mine);
      setCommunityContacts(community);
      setFilteredContacts(filtered);
    } catch (loadError) {
      console.error('Failed to load contacts:', loadError);
      setError('Unable to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);
    return subscribeToContacts(user.uid, (nextContacts) => {
      setMyContacts(nextContacts.myContacts);
      setCommunityContacts(nextContacts.communityContacts);
      setFilteredContacts(nextContacts.filteredContacts);
      setLoading(false);
    }, () => {
      setError('Unable to load contacts. Please try again.');
      setLoading(false);
    });
  }, [user]);

  return { myContacts, communityContacts, filteredContacts, loading, error, refresh };
};
