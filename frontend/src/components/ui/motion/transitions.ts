import type { Transition, Variants } from 'motion/react';

export const overlayTransition: Transition = { duration: 0.2, ease: 'easeOut' };

export const panelTransition: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
  mass: 0.8,
};

export const toastTransition: Transition = {
  type: 'spring',
  damping: 20,
  stiffness: 260,
  mass: 0.6,
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 40, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 40, scale: 0.95 },
};

export const supportPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 6, transformOrigin: 'bottom right' },
  visible: { opacity: 1, scale: 1, y: 0, transformOrigin: 'bottom right' },
};
