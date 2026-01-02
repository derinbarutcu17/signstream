// src/lib/PoseLibrary.ts
import type { Point3D } from './VectorMath';

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface PoseConfig {
    name: string;
    curls: Record<FingerName, 'Open' | 'Closed' | 'Any'>;
    // Optional direction constraints
    directions?: Partial<Record<FingerName, Point3D>>;
}

// Order matters! More specific poses should come FIRST
// Poses with more Closed fingers are more distinctive
export const POSE_LIBRARY: PoseConfig[] = [
    // === FIST-BASED (Most distinctive - many closed fingers) ===
    {
        name: 'A',
        // Fist with thumb on side (extended outward)
        curls: { thumb: 'Open', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    },
    {
        name: 'S',
        // Tight fist with thumb over fingers
        curls: { thumb: 'Closed', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    },
    {
        name: 'E',
        // All fingers curled, thumb tucked
        curls: { thumb: 'Closed', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    },

    // === ONE FINGER UP ===
    {
        name: 'I',
        // Only pinky up
        curls: { thumb: 'Closed', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Open' },
    },
    {
        name: 'D',
        // Only index up (others touching thumb)
        curls: { thumb: 'Open', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    },

    // === TWO FINGERS UP ===
    {
        name: 'V',
        // Peace sign: index + middle up, spread apart
        curls: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Closed', pinky: 'Closed' },
    },
    {
        name: 'U',
        // Index + middle up together (touching)
        curls: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Closed', pinky: 'Closed' },
    },
    {
        name: 'R',
        // Index + middle crossed
        curls: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Closed', pinky: 'Closed' },
    },
    {
        name: 'L',
        // Thumb + index extended (L shape)
        curls: { thumb: 'Open', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    },
    {
        name: 'Y',
        // Thumb + pinky extended
        curls: { thumb: 'Open', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Open' },
    },

    // === THREE FINGERS UP ===
    {
        name: 'W',
        // Index + middle + ring up and spread
        curls: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Closed' },
    },
    {
        name: 'F',
        // Thumb + index touching (OK sign), other 3 up
        curls: { thumb: 'Closed', index: 'Closed', middle: 'Open', ring: 'Open', pinky: 'Open' },
    },

    // === FOUR/FIVE FINGERS (Least distinctive - put last) ===
    {
        name: 'B',
        // Flat hand: all 4 fingers up, thumb tucked across palm
        curls: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    },
    // C is removed because it's too ambiguous with just curl detection
    // It requires curvature analysis which we don't have yet
];
