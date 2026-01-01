
export type HandLandmark = { x: number; y: number; z: number };

// A normalized 3D vector
type Vector3 = { x: number; y: number; z: number };

// Pose definition with both vectors AND curl states
type PoseDef = {
    vectors: Vector3[];  // Direction vectors for each finger
    curls: boolean[];    // [thumb, index, middle, ring, pinky] - true = extended
};

// Finger indices for defining vectors (Base -> Tip)
// We use MCP -> Tip to capture full finger direction
const FINGER_VECTORS = {
    thumb: [2, 4],   // Thumb MCP -> Tip
    index: [5, 8],   // Index MCP -> Tip
    middle: [9, 12], // Middle MCP -> Tip
    ring: [13, 16],  // Ring MCP -> Tip
    pinky: [17, 20]  // Pinky MCP -> Tip
};

// Finger tip and MCP indices for curl calculation
const FINGER_CURL_INDICES = {
    thumb: { mcp: 2, tip: 4 },
    index: { mcp: 5, tip: 8 },
    middle: { mcp: 9, tip: 12 },
    ring: { mcp: 13, tip: 16 },
    pinky: { mcp: 17, tip: 20 }
};

export class VectorEngine {
    constructor() { }

    /**
     * Main entry point: Matches current landmarks against canonical poses.
     * Uses HYBRID scoring: Curl analysis (40%) + Vector similarity (60%)
     * @param landmarks Raw World Landmarks from MediaPipe
     * @returns Best matching letter and its score (0-1)
     */
    public matchPose(landmarks: HandLandmark[]): { letter: string | null; score: number } {
        if (!landmarks || landmarks.length < 21) {
            return { letter: null, score: 0 };
        }

        // 1. Compute Local Coordinate System (Basis) - Using STABLE Knuckle Bar
        const basis = this.computeHandBasis(landmarks);

        // 2. Extract Feature Vectors (in Local Frame)
        const features = this.extractFeatures(landmarks, basis);

        // 3. Calculate Curl States
        const currentCurls = this.calculateCurls(landmarks);

        // Debug: Log current curl state once per second (throttled)
        if (Math.random() < 0.03) {
            const curlStr = currentCurls.map(c => c ? 'O' : 'X').join('');
            console.log(`[VectorEngine] Curls: ${curlStr} (O=extended, X=curled)`);
        }

        // 4. Compare against Canonical Dictionary with HYBRID scoring
        let bestMatch: string | null = null;
        let bestScore = -1;

        for (const [letter, pose] of Object.entries(CANONICAL_POSES)) {
            // Step A: Curl Match
            const curlMatchScore = this.calculateCurlMatch(currentCurls, pose.curls);

            // Step B: Vector Similarity (raw cosine, clamped to 0-1)
            const vectorScore = this.calculateSimilarity(features, pose.vectors);

            // Step C: Hybrid Score = 40% Curls + 60% Vectors
            // No gatekeeper - let the hybrid score decide
            const totalScore = (curlMatchScore * 0.4) + (vectorScore * 0.6);

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestMatch = letter;
            }
        }

        return { letter: bestMatch, score: bestScore };
    }

    /**
     * Calculates similarity (0-1) between current landmarks and a specific target letter.
     */
    public calculateTargetSimilarity(landmarks: HandLandmark[], targetLetter: string): number {
        if (!landmarks || landmarks.length < 21) return 0;

        const targetPose = CANONICAL_POSES[targetLetter];
        if (!targetPose) return 0;

        const basis = this.computeHandBasis(landmarks);
        const features = this.extractFeatures(landmarks, basis);
        const currentCurls = this.calculateCurls(landmarks);

        const curlScore = this.calculateCurlMatch(currentCurls, targetPose.curls);
        const vectorScore = this.calculateSimilarity(features, targetPose.vectors);

        return Math.max(0, (curlScore * 0.4) + (vectorScore * 0.6));
    }

    /**
     * Debug method for calibration - logs current hand state to console.
     * Call this with a keypress to capture real hand vectors.
     */
    public debugCurrentPose(landmarks: HandLandmark[]): void {
        if (!landmarks || landmarks.length < 21) {
            console.log('[VectorEngine] No landmarks to debug');
            return;
        }

        const basis = this.computeHandBasis(landmarks);
        const features = this.extractFeatures(landmarks, basis);
        const curls = this.calculateCurls(landmarks);

        console.log('=== [VectorEngine] CALIBRATION DATA ===');
        console.log('Curls:', JSON.stringify(curls));
        console.log('Vectors:', JSON.stringify(features.map(v => ({
            x: +v.x.toFixed(2),
            y: +v.y.toFixed(2),
            z: +v.z.toFixed(2)
        }))));
        console.log('========================================');
    }

    /**
     * Computes a STABLE Local Basis using the KNUCKLE BAR.
     * This is rotation-invariant and doesn't flip when fingers curl.
     * 
     * X-Axis: Index MCP -> Pinky MCP (the stable "knuckle bar")
     * Z-Axis: Palm Normal (perpendicular to palm, pointing out)
     * Y-Axis: Cross(Z, X) - pointing "up" along fingers
     */
    private computeHandBasis(landmarks: HandLandmark[]): { x: Vector3; y: Vector3; z: Vector3 } {
        const wrist = landmarks[0];
        const indexMcp = landmarks[5];
        const pinkyMcp = landmarks[17];

        // 1. PRIMARY AXIS: X-Axis (The Knuckle Bar)
        // Vector from Index MCP to Pinky MCP - this is VERY stable
        let xAxis = this.sub(pinkyMcp, indexMcp);
        xAxis = this.normalize(xAxis);

        // 2. SECONDARY VECTOR: Wrist to Index MCP (to define the palm plane)
        const wristToIndex = this.sub(indexMcp, wrist);

        // 3. Z-Axis (Palm Normal)
        // Cross product of X (Knuckles) and (Wrist->Index) gives vector pointing OUT of palm
        let zAxis = this.cross(xAxis, wristToIndex);
        zAxis = this.normalize(zAxis);

        // 4. Y-Axis (Finger Direction)
        // Cross product of Z and X gives the "up" direction along fingers
        let yAxis = this.cross(zAxis, xAxis);
        yAxis = this.normalize(yAxis);

        return { x: xAxis, y: yAxis, z: zAxis };
    }

    /**
     * Calculates whether each finger is EXTENDED (true) or CURLED (false).
     * Uses distance ratio: tip-to-wrist vs mcp-to-wrist.
     * If tip is significantly further than MCP, the finger is extended.
     */
    private calculateCurls(landmarks: HandLandmark[]): boolean[] {
        const wrist = landmarks[0];
        const curls: boolean[] = [];

        // Thumb is special - check if tip is far from wrist
        const thumbTip = landmarks[FINGER_CURL_INDICES.thumb.tip];
        const thumbMcp = landmarks[FINGER_CURL_INDICES.thumb.mcp];
        const thumbTipDist = this.dist(thumbTip, wrist);
        const thumbMcpDist = this.dist(thumbMcp, wrist);
        // Lower threshold (1.1) for more lenient detection
        curls.push(thumbTipDist > thumbMcpDist * 1.1);

        // Other fingers - compare tip distance to MCP distance
        const fingerNames: Array<'index' | 'middle' | 'ring' | 'pinky'> = ['index', 'middle', 'ring', 'pinky'];
        for (const finger of fingerNames) {
            const tipIdx = FINGER_CURL_INDICES[finger].tip;
            const mcpIdx = FINGER_CURL_INDICES[finger].mcp;

            const tipDist = this.dist(landmarks[tipIdx], wrist);
            const mcpDist = this.dist(landmarks[mcpIdx], wrist);

            // Lower threshold (1.1) - if tip is further than MCP * 1.1, finger is extended
            curls.push(tipDist > mcpDist * 1.1);
        }

        return curls;
    }

    /**
     * Calculates how well the curl states match (0-1).
     * 1.0 = all 5 fingers match, 0.0 = none match.
     */
    private calculateCurlMatch(current: boolean[], target: boolean[]): number {
        let matches = 0;
        for (let i = 0; i < 5; i++) {
            if (current[i] === target[i]) matches++;
        }
        return matches / 5;
    }

    /**
     * Extracts 5 direction vectors (one per finger) projected into the Local Basis.
     */
    private extractFeatures(landmarks: HandLandmark[], basis: { x: Vector3; y: Vector3; z: Vector3 }): Vector3[] {
        const vectors: Vector3[] = [];

        for (const [, [startIdx, endIdx]] of Object.entries(FINGER_VECTORS)) {
            const start = landmarks[startIdx];
            const end = landmarks[endIdx];

            // 1. Get raw world vector
            const rawVec = this.sub(end, start);
            const normalizedRaw = this.normalize(rawVec);

            // 2. Project into Local Basis
            const localVec: Vector3 = {
                x: this.dot(normalizedRaw, basis.x),
                y: this.dot(normalizedRaw, basis.y),
                z: this.dot(normalizedRaw, basis.z)
            };

            vectors.push(localVec);
        }

        return vectors;
    }

    /**
     * Calculates average Cosine Similarity between two sets of feature vectors.
     */
    private calculateSimilarity(current: Vector3[], target: Vector3[]): number {
        if (current.length !== target.length) return 0;

        let totalScore = 0;
        for (let i = 0; i < current.length; i++) {
            totalScore += this.dot(current[i], target[i]);
        }

        // Average score (-1 to 1), then normalize to 0-1
        const avg = totalScore / current.length;
        return (avg + 1) / 2; // Map -1..1 to 0..1
    }

    // --- Vector Math Helpers ---

    private sub(a: HandLandmark, b: HandLandmark): Vector3 {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    private normalize(v: Vector3): Vector3 {
        const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
        return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    }

    private dot(a: Vector3, b: Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    private cross(a: Vector3, b: Vector3): Vector3 {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    private dist(a: HandLandmark, b: HandLandmark): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

// --- Canonical Poses Definitions ---
// Each pose has:
// - curls: [thumb, index, middle, ring, pinky] - true = extended, false = curled
// - vectors: Direction vectors for each finger in Local Coordinate System
//   (To be calibrated using debugCurrentPose())

const CANONICAL_POSES: Record<string, PoseDef> = {
    // A: Fist with thumb on side (thumb extended, fingers curled)
    'A': {
        curls: [true, false, false, false, false],
        vectors: [
            { x: 0.5, y: 0.5, z: 0.5 },   // Thumb: Side/Up
            { x: 0, y: -0.5, z: 0.5 },    // Index: Curled in
            { x: 0, y: -0.5, z: 0.5 },    // Middle
            { x: 0, y: -0.5, z: 0.5 },    // Ring
            { x: 0, y: -0.5, z: 0.5 }     // Pinky
        ]
    },

    // B: Flat hand, all fingers up, thumb tucked
    'B': {
        curls: [false, true, true, true, true],
        vectors: [
            { x: -0.5, y: 0.3, z: 0.5 },  // Thumb: Tucked across palm
            { x: -0.1, y: 0.9, z: 0.2 },  // Index: Up
            { x: 0, y: 0.95, z: 0.2 },    // Middle: Up
            { x: 0.1, y: 0.9, z: 0.2 },   // Ring: Up
            { x: 0.2, y: 0.85, z: 0.2 }   // Pinky: Up/slightly out
        ]
    },

    // C: Curved hand (all fingers extended but curved)
    'C': {
        curls: [true, true, true, true, true],
        vectors: [
            { x: 0.5, y: 0.3, z: 0.7 },   // Thumb: Forward/out
            { x: -0.1, y: 0.4, z: 0.8 },  // Index: Forward/up
            { x: 0, y: 0.4, z: 0.8 },     // Middle
            { x: 0.1, y: 0.4, z: 0.8 },   // Ring
            { x: 0.2, y: 0.4, z: 0.8 }    // Pinky
        ]
    },

    // D: Index up, others form circle with thumb
    'D': {
        curls: [true, true, false, false, false],
        vectors: [
            { x: 0.3, y: 0, z: 0.9 },     // Thumb: Forward (touching middle)
            { x: 0, y: 0.95, z: 0.2 },    // Index: Straight up
            { x: 0, y: 0, z: 0.9 },       // Middle: Forward (curled to thumb)
            { x: 0.1, y: 0, z: 0.9 },     // Ring
            { x: 0.2, y: 0, z: 0.9 }      // Pinky
        ]
    },

    // L: Index up, thumb out (L shape)
    'L': {
        curls: [true, true, false, false, false],
        vectors: [
            { x: 0.9, y: 0.3, z: 0.2 },   // Thumb: Out to side
            { x: 0, y: 0.95, z: 0.2 },    // Index: Up
            { x: 0, y: -0.3, z: 0.8 },    // Middle: Curled
            { x: 0.1, y: -0.3, z: 0.8 },  // Ring
            { x: 0.2, y: -0.3, z: 0.8 }   // Pinky
        ]
    },

    // O: Circle shape (all fingertips touching thumb)
    'O': {
        curls: [true, true, true, true, true],
        vectors: [
            { x: 0.2, y: -0.2, z: 0.9 },  // Thumb: Forward/down
            { x: -0.1, y: -0.2, z: 0.9 }, // Index: Forward
            { x: 0, y: -0.2, z: 0.9 },    // Middle
            { x: 0.1, y: -0.2, z: 0.9 },  // Ring
            { x: 0.2, y: -0.2, z: 0.9 }   // Pinky
        ]
    },

    // V: Peace sign (index and middle up, spread)
    'V': {
        curls: [false, true, true, false, false],
        vectors: [
            { x: -0.5, y: 0, z: 0.7 },    // Thumb: Tucked/forward
            { x: -0.3, y: 0.85, z: 0.2 }, // Index: Up/left
            { x: 0.3, y: 0.85, z: 0.2 },  // Middle: Up/right
            { x: 0.1, y: -0.3, z: 0.9 },  // Ring: Curled
            { x: 0.2, y: -0.3, z: 0.9 }   // Pinky: Curled
        ]
    },

    // W: Three fingers up (index, middle, ring spread)
    'W': {
        curls: [false, true, true, true, false],
        vectors: [
            { x: -0.5, y: 0, z: 0.7 },    // Thumb: Tucked/forward
            { x: -0.4, y: 0.8, z: 0.2 },  // Index: Up/left
            { x: 0, y: 0.9, z: 0.2 },     // Middle: Straight up
            { x: 0.4, y: 0.8, z: 0.2 },   // Ring: Up/right
            { x: 0.3, y: -0.2, z: 0.9 }   // Pinky: Curled
        ]
    },

    // Y: Shaka (thumb and pinky out)
    'Y': {
        curls: [true, false, false, false, true],
        vectors: [
            { x: 0.9, y: 0.3, z: 0.2 },   // Thumb: Out to side
            { x: 0, y: -0.3, z: 0.9 },    // Index: Curled
            { x: 0.1, y: -0.3, z: 0.9 },  // Middle: Curled
            { x: 0.2, y: -0.3, z: 0.9 },  // Ring: Curled
            { x: 0.5, y: 0.7, z: 0.3 }    // Pinky: Out/up
        ]
    }
};
