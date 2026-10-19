import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PhotoLightbox } from './components/PhotoLightbox';

const PHOTO = 'http://192.168.0.4:9199/v0/b/outreach-slot-availability.firebasestorage.app/o/profile_photos%2FfvzsIhYHshmJ3RsMU6RkelHYTk7V%2Fseed.jpg?alt=media&token=4cb5c3c9-2930-4772-a760-bc54936218d2';

const Check = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-10">
      <button
        type="button"
        className="app-button-primary"
        onClick={() => setOpen(true)}
      >
        Open lightbox
      </button>
      <p className="mt-4 text-sm text-muted">Click the button, then press Escape to close.</p>
      {open && (
        <PhotoLightbox
          src={PHOTO}
          alt="Lightbox Tester profile photo"
          caption="Lightbox Tester"
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Check />
  </StrictMode>,
);
