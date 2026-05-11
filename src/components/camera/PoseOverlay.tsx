/**
 * Renders the 33-keypoint skeleton on a canvas overlay.
 *
 * Pure presentation — given a *ref* to the most recent PoseFrame, draws
 * lines and dots in its own rAF loop. The ref-based input is critical for
 * perf: parent (CameraStream) used to call `setState(latestFrame)` on every
 * MediaPipe frame, triggering 30-60 React re-renders per second of the
 * whole tree. With refs the camera state is decoupled from React render.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { PoseFrame } from '@/types';

// Skeleton connections (BlazePose pairs that visually form a body).
const POSE_CONNECTIONS: Array<[number, number]> = [
  // Shoulders → arms
  [11, 13],
  [13, 15], // left arm
  [12, 14],
  [14, 16], // right arm
  [11, 12], // shoulder line
  // Torso
  [11, 23],
  [12, 24],
  [23, 24],
  // Legs
  [23, 25],
  [25, 27],
  [27, 29],
  [27, 31], // left leg
  [24, 26],
  [26, 28],
  [28, 30],
  [28, 32], // right leg
  // Face (minimal)
  [0, 11],
  [0, 12],
];

type Props = {
  /** Parent (CameraStream) yazdığı son PoseFrame ref'i. */
  frameRef: MutableRefObject<PoseFrame | null>;
  width: number;
  height: number;
  flip?: boolean; // mirror for selfie cam
};

export function PoseOverlay({ frameRef, width, height, flip = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      ctx.clearRect(0, 0, width, height);
      const frame = frameRef.current;
      if (frame) {
        // Scale normalized coords to canvas size, with optional horizontal flip.
        const projectX = (x: number) => (flip ? (1 - x) * width : x * width);
        const projectY = (y: number) => y * height;

        // Draw connections
        ctx.strokeStyle = '#22d3ee'; // cyan-400
        ctx.lineWidth = 2;
        for (const [a, b] of POSE_CONNECTIONS) {
          const lmA = frame.landmarks[a];
          const lmB = frame.landmarks[b];
          if (!lmA || !lmB) continue;
          if ((lmA.visibility ?? 1) < 0.5 || (lmB.visibility ?? 1) < 0.5) continue;
          ctx.beginPath();
          ctx.moveTo(projectX(lmA.x), projectY(lmA.y));
          ctx.lineTo(projectX(lmB.x), projectY(lmB.y));
          ctx.stroke();
        }

        // Draw keypoints
        ctx.fillStyle = '#f59e0b'; // amber-500
        for (const lm of frame.landmarks) {
          if ((lm.visibility ?? 1) < 0.5) continue;
          ctx.beginPath();
          ctx.arc(projectX(lm.x), projectY(lm.y), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [frameRef, width, height, flip]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0"
    />
  );
}
