// src/lib/GestureLogic.ts
// Gesture recognition using geometric constraints
import { VectorMath } from './VectorMath';
import type { Point3D } from './VectorMath';

type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
type CurlState = Record<FingerName, boolean>; // true = extended/open

export class GestureLogic {

    public analyze(landmarks: Point3D[]): { match: string | null; score: number } {
        if (landmarks.length < 21) return { match: null, score: 0 };

        // Get all the measurements we need
        const ext = this.getExtensions(landmarks);
        const spread = this.getFingerSpread(landmarks);
        const thumbOut = this.isThumbOut(landmarks);
        const thumbIndexTouching = this.isThumbIndexTouching(landmarks);

        // Count extended fingers (excluding thumb)
        const fingerCount = [ext.index, ext.middle, ext.ring, ext.pinky].filter(Boolean).length;

        // Debug output
        console.log('[Gesture]', JSON.stringify({
            ext: { t: ext.thumb, i: ext.index, m: ext.middle, r: ext.ring, p: ext.pinky },
            spread: spread.toFixed(1),
            thumbOut,
            thumbIndexTouching,
            fingerCount
        }));

        // === DETECTION LOGIC (most specific first) ===

        // F = Thumb and index touching/curled, middle+ring+pinky extended
        // Check this BEFORE 4-finger check since it's more specific
        if (thumbIndexTouching && ext.middle && ext.ring && ext.pinky) {
            return { match: 'F', score: 1.0 };
        }

        // FOUR FINGERS = B (flat hand)
        if (fingerCount === 4) {
            return { match: 'B', score: 1.0 };
        }

        // THREE FINGERS
        if (fingerCount === 3) {
            // Index + Middle + Ring = W
            if (ext.index && ext.middle && ext.ring && !ext.pinky) {
                return { match: 'W', score: 1.0 };
            }
            // Middle + Ring + Pinky (no index) = could also be F, but caught above
        }

        // TWO FINGERS
        if (fingerCount === 2) {
            // Index + Middle (V, U, R)
            if (ext.index && ext.middle && !ext.ring && !ext.pinky) {
                // R = crossed fingers (very tight spread)
                if (spread < 0.8) {
                    return { match: 'R', score: 1.0 };
                }
                // V = spread apart
                else if (spread > 1.5) {
                    return { match: 'V', score: 1.0 };
                }
                // U = together but not crossed
                else {
                    return { match: 'U', score: 1.0 };
                }
            }
        }

        // ONE FINGER
        if (fingerCount === 1) {
            // Pinky only
            if (ext.pinky && !ext.ring && !ext.middle && !ext.index) {
                // Y = thumb also extended/visible, I = just pinky
                return { match: ext.thumb ? 'Y' : 'I', score: 1.0 };
            }
            // Index only
            // L = thumb ALSO extended (L-shape with thumb + index)
            // D = just index pointing up (no thumb extended)
            if (ext.index && !ext.middle) {
                return { match: ext.thumb ? 'L' : 'D', score: 1.0 };
            }
        }

        // FIST (no fingers extended) - always A
        // (S and E removed - too similar and unreliable to detect)
        if (fingerCount === 0) {
            return { match: 'A', score: 1.0 };
        }

        return { match: null, score: 0 };
    }

    // Check if each finger is extended
    private getExtensions(lm: Point3D[]): CurlState {
        const wrist = lm[0];

        const isExtended = (tipIdx: number, mcpIdx: number) => {
            const tipDist = VectorMath.dist(lm[tipIdx], wrist);
            const mcpDist = VectorMath.dist(lm[mcpIdx], wrist);
            return tipDist > mcpDist * 1.2;
        };

        // Thumb: check if tip is far from index base
        const thumbExtended = () => {
            const thumbTip = lm[4];
            const indexMcp = lm[5];
            const tipToIndex = VectorMath.dist(thumbTip, indexMcp);
            const wristToIndex = VectorMath.dist(wrist, indexMcp);
            return tipToIndex > wristToIndex * 0.7;
        };

        return {
            thumb: thumbExtended(),
            index: isExtended(8, 5),
            middle: isExtended(12, 9),
            ring: isExtended(16, 13),
            pinky: isExtended(20, 17),
        };
    }

    // Is thumb sticking OUT from the fist (for A vs S, L vs D, Y vs I)
    // A-BIASED: Default is thumbOut = true (A)
    // S = ONLY when thumb is deeply tucked IN FRONT of the curled fingers
    private isThumbOut(lm: Point3D[]): boolean {
        const thumbTip = lm[4];
        const indexMcp = lm[5];
        const middleMcp = lm[9];
        const pinkyMcp = lm[17];
        const wrist = lm[0];
        const indexPip = lm[6];  // Proximal interphalangeal joint of index

        // Create a palm normal vector using cross product
        // This gives us the direction the palm is facing (forward/backward)
        const v1 = VectorMath.sub(indexMcp, wrist);
        const v2 = VectorMath.sub(pinkyMcp, wrist);
        const palmNormal = VectorMath.cross(v1, v2);
        const palmNormalNorm = VectorMath.normalize(palmNormal);

        // Vector from palm center (middleMcp) to thumb tip
        const palmToThumb = VectorMath.sub(thumbTip, middleMcp);

        // Project onto palm normal to get depth (how far in front of palm)
        // Positive = in front of palm (toward camera when palm faces camera)
        const depthFromPalm = VectorMath.dot(palmToThumb, palmNormalNorm);
        const palmWidthDist = VectorMath.dist(pinkyMcp, indexMcp);

        // For S: Thumb must be SIGNIFICANTLY in front of the palm
        // This means the thumb is wrapped OVER the curled fingers
        // Require depth > 0.6x palm width (very strict - thumb must be deeply tucked)
        const isDeepInFront = depthFromPalm > palmWidthDist * 0.6;

        // Also check if thumb is close to the fingers (near index PIP joint)
        // For S, thumb should be close to where the fingers curl
        const thumbToIndexPip = VectorMath.dist(thumbTip, indexPip);
        const isNearFingers = thumbToIndexPip < palmWidthDist * 0.8;

        // S = thumb is deeply in front AND close to the curled fingers
        // A = everything else (default)
        const isThumbTuckedForS = isDeepInFront && isNearFingers;

        // Return TRUE for A (thumb visible/out), FALSE for S (thumb tucked)
        return !isThumbTuckedForS;
    }

    // Check if thumb and index finger tips are touching/close (for F gesture)
    private isThumbIndexTouching(lm: Point3D[]): boolean {
        const thumbTip = lm[4];
        const indexTip = lm[8];
        const indexMcp = lm[5];
        const middleMcp = lm[9];

        const tipDistance = VectorMath.dist(thumbTip, indexTip);
        const fingerBaseDist = VectorMath.dist(indexMcp, middleMcp);

        // Tips are "touching" if they're closer than the distance between finger bases
        // Using 1.8x multiplier for more lenient detection (F gesture)
        return tipDistance < fingerBaseDist * 1.8;
    }

    // Get spread ratio between index and middle fingers
    private getFingerSpread(lm: Point3D[]): number {
        const indexTip = lm[8];
        const middleTip = lm[12];
        const indexMcp = lm[5];
        const middleMcp = lm[9];

        const tipDist = VectorMath.dist(indexTip, middleTip);
        const mcpDist = VectorMath.dist(indexMcp, middleMcp);

        return mcpDist > 0 ? tipDist / mcpDist : 0;
    }
}
