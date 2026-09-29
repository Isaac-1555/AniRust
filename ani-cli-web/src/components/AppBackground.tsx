import { useState } from 'react';
import ShapeWaves from './ShapeWaves/ShapeWaves';

export function AppBackground() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.18) 0%, rgba(12,13,16,0) 60%), radial-gradient(50% 45% at 85% 100%, rgba(217,119,6,0.14) 0%, rgba(12,13,16,0) 60%), #0c0d10',
        }}
      />
      {!failed && (
        <ShapeWaves
          className="absolute inset-0"
          shapes="mixed"
          cellSize={10}
          dotSize={0.62}
          color="#8b5cf6"
          hoverColor="#f59e0b"
          backgroundColor="#0c0d10"
          speed={0.55}
          scale={1.25}
          brightness={0.32}
          contrast={0.95}
          fade={0.55}
          glow={0.4}
          interactive
          splashRadius={48}
          splashStrength={0.7}
          onError={() => setFailed(true)}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,13,16,0.72) 0%, rgba(12,13,16,0.26) 34%, rgba(12,13,16,0.6) 100%)',
        }}
      />
    </div>
  );
}
