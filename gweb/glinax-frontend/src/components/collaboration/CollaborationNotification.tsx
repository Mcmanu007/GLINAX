'use client';

import { useEffect, useState } from 'react';
import { getPendingCollaborations } from '@/lib/api/collaboration';

const CollaborationNotification = () => {
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getPendingCollaborations()
      .then((data) => {
        if (data.length > 0) setPending(true);
      })
      .catch(console.error);
  }, []);

  if (!pending || dismissed) return null;

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 text-yellow-800 mb-4 flex justify-between items-center">
      <span>You have pending collaboration invites. <a href="/chat" className="underline">View</a></span>
      <button onClick={() => setDismissed(true)} className="text-sm">Dismiss</button>
    </div>
  );
};

export default CollaborationNotification;
