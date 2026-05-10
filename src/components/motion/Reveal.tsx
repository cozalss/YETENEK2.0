/**
 * Reveal — scroll'a girdiğinde içeriği fade + slide ile açan motion utility.
 *
 * Tek bir component pattern'i ile sayfa boyunca tutarlı reveal kullanılıyor.
 * Frame-by-frame değil, viewport intersection bazlı (performans dostu).
 *
 * Kullanım:
 *   <Reveal>...içerik...</Reveal>
 *   <Reveal delay={0.1} from="left">...</Reveal>
 */

'use client';

import { motion, type Variants } from 'motion/react';
import { type ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade';

interface Props {
  children: ReactNode;
  delay?: number;
  duration?: number;
  from?: Direction;
  className?: string;
  once?: boolean;
}

const offsetMap: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  fade: { x: 0, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  duration = 0.7,
  from = 'up',
  className,
  once = true,
}: Props) {
  const offset = offsetMap[from];

  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: offset.x,
      y: offset.y,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
