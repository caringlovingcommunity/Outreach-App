import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ProfilePhotoPicker } from './components/ProfilePhotoPicker';

const Check = () => {
  const [url, setUrl] = useState<string>('');
  return (
    <div className="p-10">
      <ProfilePhotoPicker
        userId="test-uid"
        photoURL={url}
        displayName="Crop Tester"
        onPhotoChanged={setUrl}
      />
      <p id="result" className="mt-4 text-sm text-muted">{url || 'no photo yet'}</p>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Check />
  </StrictMode>,
);
