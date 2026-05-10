/**
 * Renders the 33-keypoint skeleton on a canvas overlay.
 * Pure presentation — given a PoseFrame, draws lines and dots.
 */

'use client';

import { useEffect, useRef } from 'react';
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
  frame: PoseFrame | null;
  width: number;
  height: number;
  flip?: boolean; // mirror for selfie cam
};

export function PoseOverlay({ frame, width, height, flip = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (!frame) return;

    // Scale normalized coords to canvas size, with optional horizontal flip.
    const project = (x: number, y: number) => ({
      x: flip ? (1 - x) * width : x * width,
      y: y * height,
    });

    // Draw connections
    ctx.strokeStyle = '#22d3ee'; // cyan-400
    ctx.lineWidth = 2;
    for (const [a, b] of POSE_CONNECTIONS) {
      const lmA = frame.landmarks[a];
      const lmB = frame.landmarks[b];
      if (!lmA || !lmB) continue;
      if ((lmA.visibility ?? 1) < 0.5 || (lmB.visibility ?? 1) < 0.5) continue;
      const pa = project(lmA.x, lmA.y);
      const pb = project(lmB.x, lmB.y);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    // Draw keypoints
    ctx.fillStyle = '#f59e0b'; // amber-500
    for (const lm of frame.landmarks) {
      if ((lm.visibility ?? 1) < 0.5) continue;
      const p = project(lm.x, lm.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [frame, width, height, flip]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0"
    />
  );
}
