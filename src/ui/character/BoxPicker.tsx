import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Capture } from './useCaptures';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface BoxPickerProps {
  capture: Capture | null;
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}

const MIN_BOX = 20;

export function BoxPicker({ capture, onCrop, onClose }: BoxPickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (capture && !element.open) element.showModal();
    if (!capture && element.open) element.close();
    setBox(null);
  }, [capture]);
  const pointAt = (event: PointerEvent) => {
    const bounds = image.current?.getBoundingClientRect();
    return bounds ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top } : { x: 0, y: 0 };
  };
  const onDown = (event: PointerEvent) => {
    start.current = pointAt(event);
    (event.target as Element).setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!start.current) return;
    const point = pointAt(event);
    setBox({ left: Math.min(start.current.x, point.x), top: Math.min(start.current.y, point.y), width: Math.abs(point.x - start.current.x), height: Math.abs(point.y - start.current.y) });
  };
  const useBox = () => {
    const shown = image.current;
    if (!shown || !box || box.width < MIN_BOX || box.height < MIN_BOX) return;
    const scale = shown.naturalWidth / shown.clientWidth;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(box.width * scale);
    canvas.height = Math.round(box.height * scale);
    canvas.getContext('2d')?.drawImage(shown, box.left * scale, box.top * scale, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) onCrop(blob); });
  };
  return (
    <dialog ref={dialog} className="dialog box-picker" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <p className="dialog-title">Drag a box around one game window</p>
      {capture && (
        <div className="box-area" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { start.current = null; }}>
          <img ref={image} src={capture.url} alt={capture.name} draggable={false} />
          {box && <span className="box-outline" style={{ left: box.left, top: box.top, width: box.width, height: box.height }} />}
        </div>
      )}
      <div className="dialog-actions">
        <button className="button ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="button" type="button" disabled={!box || box.width < MIN_BOX || box.height < MIN_BOX} onClick={useBox}>Add this window</button>
      </div>
    </dialog>
  );
}
