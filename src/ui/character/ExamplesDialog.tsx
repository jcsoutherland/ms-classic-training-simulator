import { useEffect, useRef } from 'react';
import { imageUrl } from '../../data/loadGameData';

const EXAMPLES: [file: string, caption: string][] = [
  ['stat.png', 'Stats window with Detail open'],
  ['equips.png', 'Equipment window, Equip tab'],
  ['skill_2.png', 'Skill window, one tab per screenshot'],
  ['skill_3.png', 'Skill window, next tab'],
];

export function ExamplesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog ref={dialog} className="dialog examples" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <p className="dialog-title">Screenshot examples</p>
      <div className="example-grid">
        {EXAMPLES.map(([file, caption]) => (
          <figure key={file}>
            <img className="pixel" src={imageUrl(`img/examples/${file}`)} alt={caption} />
            <figcaption className="muted">{caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="dialog-actions">
        <button className="button" type="button" onClick={onClose}>Close</button>
      </div>
    </dialog>
  );
}
