// src/lib/GestureLogic.ts
import { VectorMath } from './VectorMath';
import type { Point3D } from './VectorMath';
import { POSE_LIBRARY } from './PoseLibrary';
import type { PoseConfig, FingerName } from './PoseLibrary';

export class GestureLogic {

    /**
     * Main function to call from App.tsx
     */
    public analyze(landmarks: Point3D[]): { match: string | null; score: number } {
        if (landmarks.length < 21) return { match: null, score: 0 };

        // 1. Calculate Finger Curls (The "Shape")
        const curls = this.calculateCurls(landmarks);

        // 2. Calculate Local Coordinate Basis (The "Rotation Fix")
        const basis = this.calculateBasis(landmarks);

        // DEBUG: Log curl states
        console.log('[GestureLogic] Curls:', curls);

        // 3. Score against Library
        let bestScore = -1;
        let bestMatch: string | null = null;

        for (const pose of POSE_LIBRARY) {
            const score = this.scorePose(pose, curls, landmarks, basis);
            if (score > bestScore && score > 0.6) { // 60% Confidence Threshold (lowered for testing)
                bestScore = score;
                bestMatch = pose.name;
            }
        }

        return { match: bestMatch, score: bestScore };
    }

    // --- Logic Internals ---

    private calculateCurls(lm: Point3D[]): Record<FingerName, 'Open' | 'Closed'> {
        const wrist = lm[0];

        // Heuristic: If Tip is further from Wrist than MCP is, it's OPEN.
        // Using 1.1 multiplier for lenient detection
        const isOpen = (tipIdx: number, mcpIdx: number) => {
            const tipDist = VectorMath.dist(lm[tipIdx], wrist);
            const mcpDist = VectorMath.dist(lm[mcpIdx], wrist);
            return tipDist > (mcpDist * 1.1); // 1.1 is lenient. Use 1.3 for strict.
        };

        return {
            thumb: isOpen(4, 2) ? 'Open' : 'Closed',
            index: isOpen(8, 5) ? 'Open' : 'Closed',
            middle: isOpen(12, 9) ? 'Open' : 'Closed',
            ring: isOpen(16, 13) ? 'Open' : 'Closed',
            pinky: isOpen(20, 17) ? 'Open' : 'Closed',
        };
    }

    private calculateBasis(lm: Point3D[]) {
        // Construct a coordinate system that moves WITH the hand
        const wrist = lm[0];
        const indexMcp = lm[5];
        const pinkyMcp = lm[17];

        // X-Axis: Line from Index Knuckle to Pinky Knuckle
        const xAxis = VectorMath.normalize(VectorMath.sub(pinkyMcp, indexMcp));

        // Z-Axis: Palm Normal (Out of hand)
        const wristToIndex = VectorMath.sub(indexMcp, wrist);
        const zAxis = VectorMath.normalize(VectorMath.cross(xAxis, wristToIndex));

        // Y-Axis: Straight Up from palm
        const yAxis = VectorMath.normalize(VectorMath.cross(zAxis, xAxis));

        return { x: xAxis, y: yAxis, z: zAxis };
    }

    private scorePose(
        pose: PoseConfig,
        currentCurls: Record<FingerName, 'Open' | 'Closed'>,
        lm: Point3D[],
        basis: { x: Point3D; y: Point3D; z: Point3D }
    ): number {
        let score = 0;
        const fingers: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

        // 1. Check Curls (Binary Pass/Fail)
        for (const f of fingers) {
            const required = pose.curls[f];
            if (required === 'Any') {
                score += 1;
                continue;
            }

            if (currentCurls[f] === required) {
                score += 1;
            } else {
                return 0; // Immediate Fail if curl is wrong
            }
        }

        // 2. Check Vectors (Analog Score)
        // Only check if defined in library
        if (pose.directions) {
            let vectorScore = 0;
            let vectorCount = 0;

            for (const [fName, targetDir] of Object.entries(pose.directions)) {
                const finger = fName as FingerName;
                // Map finger name to indices
                const indices: Record<FingerName, [number, number]> = {
                    thumb: [2, 4],
                    index: [5, 8],
                    middle: [9, 12],
                    ring: [13, 16],
                    pinky: [17, 20]
                };
                const [start, end] = indices[finger];

                // Get finger vector in World Space
                const fingerVec = VectorMath.normalize(VectorMath.sub(lm[end], lm[start]));

                // Convert World Space -> Local Hand Space
                const localVec = {
                    x: VectorMath.dot(fingerVec, basis.x),
                    y: VectorMath.dot(fingerVec, basis.y),
                    z: VectorMath.dot(fingerVec, basis.z)
                };

                // Compare with Target
                const similarity = VectorMath.dot(localVec, VectorMath.normalize(targetDir));
                vectorScore += similarity;
                vectorCount++;
            }

            // Add normalized vector score (0 to 1) to base score (5)
            if (vectorCount > 0) {
                score += (vectorScore / vectorCount);
            }
        }

        // Max potential score is 5 (curls) + 1 (vectors) = 6.
        return score / 6;
    }
}
