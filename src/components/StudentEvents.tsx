import React from 'react';
import { EventParticipation } from './EventParticipation';
import type { UserProfile } from '../types';

interface Props {
  user: UserProfile;
}

export const StudentEvents: React.FC<Props> = ({ user }) => {
  return <EventParticipation user={user} />;
};
