import type { Results } from '@mediapipe/hands';

export type FingerState = 'Extended' | 'Folded' | 'Closed';
export type HandLandmark = { x: number; y: number; z: number };

export class GestureEngine {
    private landmarks: HandLandmark[] | null = null;
    private worldLandmarks: HandLandmark[] | null = null;

    // Smooth factor (0-1). Lower = smoother but more lag.
    private readonly alpha = 0.65;

    // State Persistence for Hysteresis
    private fingerStates: Map<string, FingerState> = new Map();
    private thumbState: 'Extended' | 'Closed' | 'Side' | 'Over' | 'Under' = 'Side';

    constructor() { }

    public update(results: Results) {
        if (!results.multiHandLandmarks?.[0]) {
            this.landmarks = null;
            this.worldLandmarks = null;
            return;
        }

        const rawLandmarks = results.multiHandLandmarks[0];
        const rawWorld = results.multiHandWorldLandmarks?.[0] || null;

        // Apply Smoothing (Lerp)
        if (this.landmarks && this.worldLandmarks && rawWorld) {
            this.landmarks = this.lerpLandmarks(this.landmarks, rawLandmarks, this.alpha);
            this.worldLandmarks = this.lerpLandmarks(this.worldLandmarks, rawWorld, this.alpha);
        } else {
            // First frame or reset
            this.landmarks = rawLandmarks;
            this.worldLandmarks = rawWorld;
        }
    }

    private lerp(start: number, end: number, amt: number): number {
        return (1 - amt) * start + amt * end;
    }

    private lerpLandmarks(prev: HandLandmark[], curr: HandLandmark[], amt: number): HandLandmark[] {
        return prev.map((p, i) => ({
            x: this.lerp(p.x, curr[i].x, amt),
            y: this.lerp(p.y, curr[i].y, amt),
            z: this.lerp(p.z, curr[i].z, amt)
        }));
    }

    // Helper: Calculate Euclidean distance
    private dist(p1: HandLandmark, p2: HandLandmark): number {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    }

    // Helper: Calculate Angle between three points (A-B-C)
    // Returns angle in degrees (0-180)
    private calculateAngle(a: HandLandmark, b: HandLandmark, c: HandLandmark): number {
        const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
        const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

        const angleRad = Math.acos(dot / (mag1 * mag2));
        return (angleRad * 180) / Math.PI;
    }

    public getPalmSize(): number {
        if (!this.worldLandmarks) return 0;
        // Wrist to Index MCP
        return this.dist(this.worldLandmarks[0], this.worldLandmarks[5]);
    }

    public getFingerState(fingerName: 'Index' | 'Middle' | 'Ring' | 'Pinky'): FingerState {
        if (!this.worldLandmarks) return 'Closed';

        const indices = {
            'Index': [0, 5, 6, 8],
            'Middle': [0, 9, 10, 12],
            'Ring': [0, 13, 14, 16],
            'Pinky': [0, 17, 18, 20]
        };

        const [_, mcp, pip, tip] = indices[fingerName];

        const lastState = this.fingerStates.get(fingerName) || 'Closed';

        // Angle at PIP joint (MCP-PIP-TIP)
        const pipAngle = this.calculateAngle(
            this.worldLandmarks[mcp],
            this.worldLandmarks[pip],
            this.worldLandmarks[tip]
        );

        // Hysteresis
        const extendThresh = lastState === 'Extended' ? 140 : 155;

        // Extended: Angle is high (straight)
        if (pipAngle > extendThresh) {
            this.fingerStates.set(fingerName, 'Extended');
            return 'Extended';
        }

        // Folded: Angle is bent (~90), but tip is still "above" the knuckle base in local space
        // We use 'wrist' distance check as a secondary heuristic
        const tipDist = this.dist(this.worldLandmarks[0], this.worldLandmarks[tip]);
        const mcpDist = this.dist(this.worldLandmarks[0], this.worldLandmarks[mcp]);

        if (pipAngle <= extendThresh && tipDist > mcpDist * 1.1) {
            this.fingerStates.set(fingerName, 'Folded');
            return 'Folded';
        }

        this.fingerStates.set(fingerName, 'Closed');
        return 'Closed';
    }

    // Advanced: Vector-based Check for Thumb Position
    public getThumbState(): 'Extended' | 'Closed' | 'Side' | 'Over' | 'Under' {
        if (!this.worldLandmarks) return 'Closed';
        const tTip = this.worldLandmarks[4];
        const iMcp = this.worldLandmarks[5];
        const rMcp = this.worldLandmarks[13]; // Ring MCP

        // Positional Metrics
        const zDiff = tTip.z - iMcp.z;
        const palmSize = this.getPalmSize();
        const distToRing = this.dist(tTip, rMcp);
        const distToIndex = this.dist(tTip, iMcp);

        // Hysteresis vars
        const isOver = this.thumbState === 'Over';
        const isUnder = this.thumbState === 'Under';

        // 1. PRIORITY: Check 'Over' (S) - Thumb wraps across hand
        // Heuristic: Thumb Tip gets closer to Ring Finger Base.
        // Hysteresis: once Over, stickier.
        const isCrossing = distToRing < distToIndex * 1.3;
        const overZThresh = isOver ? 0.02 : -0.01;

        if (isCrossing && distToRing < palmSize * 0.9 && zDiff < overZThresh) {
            this.thumbState = 'Over';
            return 'Over';
        }

        // 2. PRIORITY: Check 'Under' (E)
        const underZThresh = isUnder ? -0.01 : 0.02;

        if (distToIndex < palmSize * 0.6 && zDiff > underZThresh) {
            this.thumbState = 'Under';
            return 'Under';
        }

        // 3. SHAPE: Check Extension vs Side
        // Angle at IP joint
        const thumbAngle = this.calculateAngle(
            this.worldLandmarks[2],
            this.worldLandmarks[3],
            this.worldLandmarks[4]
        );

        if (thumbAngle > 150) {
            // It is straight. But is it 'Extended' (L) or 'Side' (A)?
            // L: Tip is FAR from Index Base.
            // A: Tip is NEAR Index Base.
            if (distToIndex > palmSize * 0.3) {
                this.thumbState = 'Extended';
                return 'Extended';
            } else {
                this.thumbState = 'Side';
                return 'Side';
            }
        }

        // If bent and not over/under, it's just 'Side' (tuckedish) or 'Closed'
        this.thumbState = 'Side';
        return 'Side';
    }

    // Advanced: Semantic / Geometric Shape Detection
    public getSemanticStates(): string[] {
        if (!this.worldLandmarks) return [];
        const states: string[] = [];
        const palmSize = this.getPalmSize();

        const tTip = this.worldLandmarks[4];
        const iTip = this.worldLandmarks[8];
        const mTip = this.worldLandmarks[12];
        const pMcp = this.worldLandmarks[17];

        // 1. Pinch Checks
        // Relaxed threshold (0.3) for easier F/O detection
        if (this.dist(tTip, iTip) < palmSize * 0.3) states.push('Thumb Touching Index');
        if (this.dist(tTip, mTip) < palmSize * 0.3) states.push('Thumb Touching Middle');

        // 2. Circularity Check (O, C)
        const tips = [8, 12, 16, 20];
        let totalDistToThumb = 0;
        tips.forEach(idx => {
            totalDistToThumb += this.dist(this.worldLandmarks![4], this.worldLandmarks![idx]);
        });
        const avgDistToThumb = totalDistToThumb / 4;

        if (avgDistToThumb < palmSize * 0.9) {
            states.push('Circular Shape');
        }

        // 3. Finger Crossing (R, U, V)
        const indexMidDist = this.dist(iTip, mTip);

        if (indexMidDist < palmSize * 0.35) {
            states.push('Index/Middle Together');

            // Robust Crossing Check (Distance Invariant)
            // If Index Tip is closer to Pinky Base than Middle Tip is --> Crossed.
            const iTipToPinky = this.dist(iTip, pMcp);
            const mTipToPinky = this.dist(mTip, pMcp);

            if (iTipToPinky < mTipToPinky) {
                states.push('Index/Middle Crossed');
            }

        } else if (indexMidDist > palmSize * 0.5) {
            states.push('Index/Middle Spread');
        }

        return states;
    }
}
