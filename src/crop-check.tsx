import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ImageCropModal, type CropArea } from './components/ImageCropModal';

const PHOTO = '/CLC.png';

const Check = () => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string>('none yet');

  return (
    <div className="p-10">
      <button type="button" className="app-button-primary" onClick={() => setOpen(true)}>
        Open crop modal
      </button>
      <p id="result" className="mt-4 text-sm text-muted">{result}</p>
      {open && (
        <ImageCropModal
          imageSrc={PHOTO}
          imageName="Lightbox Tester"
          onCancel={() => setOpen(false)}
          onSave={(crop: CropArea) => {
            setResult(`crop = x:${crop.x} y:${crop.y} w:${crop.width} h:${crop.height}`);
            setOpen(false);
          }}
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
