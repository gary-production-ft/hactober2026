import { useEffect, useRef } from "react";

interface HistoryPoint { x: number; y: number; }
interface SkullChainProps {
  playerX: number;
  playerY: number;
  cellW: number;
  cellH: number;
  chainLength: number;
  followSpeed: number;
  isHunting: boolean;
  gridRef: React.RefObject<HTMLDivElement>;
}

const MAX_HISTORY = 220;
const SPACING_STEPS = 14;

export default function SkullChain({ playerX, playerY, cellW, cellH, chainLength, followSpeed, isHunting, gridRef }: SkullChainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const historyRef = useRef<HistoryPoint[]>([]);
  const segmentsRef = useRef<{ x: number; y: number }[]>([]);
  const lastGrid = useRef({ x: playerX, y: playerY });

  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  useEffect(() => {
    const px = playerX * cellW + cellW / 2;
    const py = playerY * cellH + cellH / 2;
    segmentsRef.current = Array.from({ length: 8 }, () => ({ x: px, y: py }));
    historyRef.current = [{ x: px, y: py }];
  }, []);

  useEffect(() => {
    if (lastGrid.current.x !== playerX || lastGrid.current.y !== playerY) {
      lastGrid.current = { x: playerX, y: playerY };
      const px = playerX * cellW + cellW / 2;
      const py = playerY * cellH + cellH / 2;
      historyRef.current.push({ x: px, y: py });
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    }
  }, [playerX, playerY, cellW, cellH]);

  useEffect(() => {
    const segs = segmentsRef.current;
    const container = containerRef.current;
    if (!container) return;

    function animate() {
      const t = Date.now();
      const history = historyRef.current;
      const skulls = container!.querySelectorAll<HTMLDivElement>(".skull-seg");
      
      let offsetX = 0;
      let offsetY = 0;
      const hasGrid = !!gridRef.current;
      if (hasGrid) {
         const rect = gridRef.current.getBoundingClientRect();
         offsetX = rect.left;
         offsetY = rect.top;
      }

      for (let i = 0; i < chainLength; i++) {
        let tx: number, ty: number;
        
        if (!hasGrid) {
          // When not in a grid (e.g. entrance screen), follow mouse globally
          tx = mouseRef.current.x;
          ty = mouseRef.current.y;
          offsetX = 0;
          offsetY = 0;
        } else {
          const idx = history.length - 1 - i * SPACING_STEPS;
          if (idx >= 0) { tx = history[idx].x; ty = history[idx].y; }
          else if (i === 0) { tx = lastGrid.current.x * cellW + cellW / 2; ty = lastGrid.current.y * cellH + cellH / 2; }
          else { tx = segs[i - 1]?.x ?? 0; ty = segs[i - 1]?.y ?? 0; }
        }

        const speed = Math.max(0.03, followSpeed * (1 - i * 0.03));
        segs[i].x += (tx - segs[i].x) * speed;
        segs[i].y += (ty - segs[i].y) * speed;

        const skull = skulls[i];
        if (!skull) continue;

        const phase = i * 0.45;
        const freq = isHunting ? 0.009 : 0.005;
        const bob = Math.sin(t * freq + phase) * (isHunting ? 5 : 2.5);
        const sway = Math.sin(t * freq * 0.6 + phase + 1) * (isHunting ? 4 : 1.8);
        const scaleBase = 1 - i * 0.05;
        const scale = scaleBase + Math.sin(t * freq * 2 + phase) * 0.07;
        const rot = Math.sin(t * 0.003 + phase * 1.5) * (isHunting ? 14 : 8);
        const opacity = Math.max(0.15, 1 - i * 0.11);
        
        // Add absolute grid offsets so the skull spans the whole page
        const finalX = segs[i].x + sway - 14 + offsetX;
        const finalY = segs[i].y + bob - 14 + offsetY;

        skull.style.transform = `translate(${finalX}px, ${finalY}px) scale(${scale}) rotate(${rot}deg)`;
        skull.style.opacity = String(opacity);
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [chainLength, followSpeed, isHunting, cellW, cellH]);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 1000 }}>
      {Array.from({ length: Math.min(chainLength, 8) }).map((_, i) => (
        <div key={i} className="skull-seg" style={{
          position: "absolute", top: 0, left: 0, width: 28, height: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: `${1.1 - i * 0.06}rem`, willChange: "transform",
          filter: isHunting ? "drop-shadow(0 0 20px crimson) drop-shadow(0 0 8px red)" : "drop-shadow(0 0 10px rgba(255,40,0,0.7))",
        }}>💀</div>
      ))}
    </div>
  );
}
