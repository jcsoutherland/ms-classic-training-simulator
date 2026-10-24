import { useEffect, useRef } from 'react';
import { stageFrame } from './timeline';
import { useStageScript, type StageRequest } from './useStageScript';
import './stage.css';

const SCENE_WIDTH = 348;
const SCENE_HEIGHT = 160;

interface CharacterWindowProps extends StageRequest {
  attacking: boolean;
  caption: string;
  label: string;
}

export function CharacterWindow({ attacking, caption, label, ...request }: CharacterWindowProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { scene, script, characterReady, problem } = useStageScript(request);

  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context || !script) return;
    context.imageSmoothingEnabled = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started = performance.now();
    let frameRequest = 0;
    const draw = (now: number) => {
      context.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      if (scene) context.drawImage(scene, 0, 0);
      drawShadow(context, script.feet.x, script.feet.y);
      if (script.monster) drawShadow(context, script.monster.x, script.monster.y);
      for (const command of stageFrame(script, reduceMotion ? 0 : now - started, attacking)) {
        context.save();
        context.globalAlpha = command.alpha;
        if (command.flip) {
          context.translate(command.left + command.image.width, command.top);
          context.scale(-1, 1);
          context.drawImage(command.image, 0, 0);
        } else context.drawImage(command.image, command.left, command.top);
        context.restore();
      }
      if (!reduceMotion) frameRequest = requestAnimationFrame(draw);
    };
    frameRequest = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRequest);
  }, [scene, script, attacking]);

  return (
    <figure className="stage-figure">
      <div className="stage">
        <canvas ref={canvas} className="pixel" width={SCENE_WIDTH} height={SCENE_HEIGHT} role="img" aria-label={label} />
        {!characterReady && !problem && <p className="stage-note">Drawing your character. A new look can take up to a minute the first time.</p>}
        {problem && <p className="stage-note">{problem} Your numbers are still correct.</p>}
      </div>
      <figcaption className="muted">{caption}</figcaption>
    </figure>
  );
}

function drawShadow(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.save();
  context.fillStyle = 'rgba(8, 7, 20, 0.45)';
  context.beginPath();
  context.ellipse(x, y, 20, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
