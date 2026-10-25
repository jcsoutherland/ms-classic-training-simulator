import { useEffect, useRef } from 'react';
import { imageUrl } from '../../data/loadGameData';

const EXAMPLES: [file: string, caption: string][] = [
  ['example-stat.png', 'Stats window with Detail open'],
  ['example-equips.png', 'Equipment window, Equip tab'],
  ['example-skill_2.png', 'Skill window, one tab per screenshot'],
  ['example-skill_3.png', 'Skill window, next tab'],
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
    <dialog ref={dialog} className="dialog examples" aria-labelledby="examples-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="examples-head">
        <p className="dialog-title" id="examples-title">Screenshot examples</p>
        <button className="pill close-button" type="button" aria-label="Close examples" onClick={onClose}>×</button>
      </div>
      <div className="example-grid">
        {EXAMPLES.map(([file, caption]) => (
          <figure key={file} className={file === 'example-stat.png' ? 'wide' : undefined}>
            <img className="pixel" src={imageUrl(`img/examples/${file}`)} alt={caption} />
            <figcaption className="muted">{caption}</figcaption>
          </figure>
        ))}
      </div>
    </dialog>
  );
}
