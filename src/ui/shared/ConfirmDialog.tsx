import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog ref={dialog} className="dialog" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <p className="dialog-title">{title}</p>
      <div className="dialog-actions">
        <button className="button ghost" type="button" onClick={onCancel}>Keep</button>
        <button className="button danger-solid" type="button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
