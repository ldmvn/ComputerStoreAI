'use client';

import { useRef, type ReactNode } from 'react';
import { m, useInView, type Transition } from 'motion/react';

const defaultTransition: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 200,
  mass: 0.8,
};

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function FadeIn({ children, delay = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ ...defaultTransition, delay }}
    >
      {children}
    </m.div>
  );
}
