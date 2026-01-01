// src/lib/PoseLibrary.ts
import type { Point3D } from './VectorMath';

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface PoseConfig {
    name: string;
    // Required Curl State: "Open" (straight) or "Closed" (bent)
    // We can add "Half" later if needed.
    curls: Record<FingerName, 'Open' | 'Closed' | 'Any'>;

    // Optional: Required Direction relative to palm (only checked if finger is Open)
    // x: +1 (Right), -1 (Left)
    // y: +1 (Up), -1 (Down)
    // z: +1 (Palm Front), -1 (Palm Back)
    directions?: Partial<Record<FingerName, Point3D>>;
}

export const POSE_LIBRARY: PoseConfig[] = [
    {
        name: 'A',
        curls: { thumb: 'Open', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
        // Thumb must point Up relative to hand
        directions: { thumb: { x: 0, y: 1, z: 0 } }
    },
    {
        name: 'B',
        curls: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
        // No specific direction needed, the curls define B perfectly
    },
    {
        name: 'C',
        // C is special: fingers are "Half" open. We'll treat them as Open but check shape in Engine?
        // Or strictly: technically C is Open fingers but curved.
        // For simplicity, let's define it as Open but add a specific Vector requirement later.
        curls: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
        directions: { index: { x: 0, y: 0, z: 1 } } // Index points FORWARD (Z) not Up
    },
    {
        name: 'V',
        curls: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Closed', pinky: 'Closed' },
        // Index points slightly Left, Middle slightly Right
        directions: {
            index: { x: -0.2, y: 1, z: 0 },
            middle: { x: 0.2, y: 1, z: 0 }
        }
    },
    // ... Add other letters here
];
