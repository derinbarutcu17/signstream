
export type HandLandmark = { x: number; y: number; z: number };

// A normalized 3D vector
type Vector3 = { x: number; y: number; z: number };

// Finger indices for defining vectors (Base -> Tip)
// We use MCP -> Tip to capture full finger direction
const FINGER_VECTORS = {
    thumb: [2, 4],  // Thumb MCP -> Tip
    index: [5, 8],  // Index MCP -> Tip
    middle: [9, 12], // Middle MCP -> Tip
    ring: [13, 16], // Ring MCP -> Tip
    pinky: [17, 20] // Pinky MCP -> Tip
};

export class VectorEngine {
    constructor() { }

    /**
     * Main entry point: Matches current landmarks against canonical poses.
     * @param landmarks Raw World Landmarks from MediaPipe
     * @returns Best matching letter and its score (0-1)
     */
    public matchPose(landmarks: HandLandmark[]): { letter: string | null; score: number } {
        if (!landmarks || landmarks.length < 21) {
            return { letter: null, score: 0 };
        }

        // 1. Compute Local Coordinate System (Basis)
        const basis = this.computeHandBasis(landmarks);

        // 2. Extract Feature Vectors (in Local Frame)
        const features = this.extractFeatures(landmarks, basis);

        // 3. Compare against Canonical Dictionary
        let bestMatch: string | null = null;
        let bestScore = -1;

        for (const [letter, pose] of Object.entries(CANONICAL_POSES)) {
            const score = this.calculateSimilarity(features, pose);
            if (score > bestScore) {
                bestScore = score;
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
        if (!targetPose) return 0; // Unknown target

        const basis = this.computeHandBasis(landmarks);
        const features = this.extractFeatures(landmarks, basis);

        // Map -1..1 to 0..1 for UI display?
        // -1 = Opposite, 0 = Orthogonal, 1 = Identifying. 
        // A cosine similarity of 0.8 is usually a good threshold.
        // Let's return raw similarity for now, but clamp to 0 if negative.
        const sim = this.calculateSimilarity(features, targetPose);
        return Math.max(0, sim);
    }

    /**
     * Computes a Local Basis (Reference Frame) for the hand.
     * Origin: Wrist (0)
     * Y-Axis: Wrist -> Middle MCP (9) projection
     * Z-Axis: Palm Normal (Cross product of Wrist-IndexAIC and Wrist-PinkyMCP)
     * X-Axis: Cross(Y, Z)
     */
    private computeHandBasis(landmarks: HandLandmark[]): { x: Vector3; y: Vector3; z: Vector3 } {
        const wrist = landmarks[0];
        const indexMcp = landmarks[5];
        const middleMcp = landmarks[9];
        const pinkyMcp = landmarks[17];

        // 1. Primary Axis (Approximate Y) - Wrist to Middle MCP
        // Note: In local frame, we usually want Y to point "Up" along fingers.
        let yAxis = this.sub(middleMcp, wrist);
        yAxis = this.normalize(yAxis);

        // 2. Secondary Vector - Wrist to Index or Pinky to define plane
        const p1 = this.sub(indexMcp, wrist);
        const p2 = this.sub(pinkyMcp, wrist);

        // 3. Z-Axis (Palm Normal)
        // Cross product of two vectors on palm plane.
        // (Index - Wrist) X (Pinky - Wrist) usually points "Out" of palm or "In" depending on hand (L/R).
        // For invariance, we might need to account for handedness or rely on absolute orientation if MediaPipe gives it.
        // Assuming Right Hand standard for now, or symmetric relations.
        let zAxis = this.cross(p1, p2);
        zAxis = this.normalize(zAxis);

        // 4. X-Axis (Orthogonal)
        let xAxis = this.cross(yAxis, zAxis);
        xAxis = this.normalize(xAxis);

        // Re-orthogonalize Y to ensure perfect 90 deg (Gram-Schmidtish)
        yAxis = this.cross(zAxis, xAxis);

        return { x: xAxis, y: yAxis, z: zAxis };
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
            // Local.x = Dot(Global, Basis.X)
            // Local.y = Dot(Global, Basis.Y)
            // Local.z = Dot(Global, Basis.Z)
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
            // Dot product of two normalized vectors is the Cosine Similarity
            // Range: -1 to 1.
            // We map it to 0-1 for easier logic? Or keep -1 to 1?
            // Let's keep strict -1 to 1, but for the final score, maybe weighted?
            totalScore += this.dot(current[i], target[i]);
        }

        // Average score (-1 to 1)
        return totalScore / current.length;
    }

    // --- Vector Math Helpers ---

    private sub(a: HandLandmark, b: HandLandmark): Vector3 {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    private normalize(v: Vector3): Vector3 {
        const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1; // Avoid div/0
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
}

// --- Canonical Poses Definitions ---
// These vectors represent the IDEAL direction of each finger in the LOCAL HAND FRAME.
// Basis: 
// +Y is "Up" (along Middle Finger)
// +X is "Side" (Thumb side for Right Hand)
// +Z is "Palm Normal"
// (Approximate values - Tuned via testing)

const CANONICAL_POSES: Record<string, Vector3[]> = {
    // A: All fingers folded down (pointing -Y or Inward?), Thumb up (+Y)
    // Actually, Thumb is Side (+X/+Y). Fingers are Folded (~0 length? No, direction is changing).
    // MCP->Tip for folded finger points DOWN (-Y) or IN (-Z). Let's assume -Y/In.
    'A': [
        { x: 0.1, y: 0.9, z: 0 },   // Thumb: Up
        { x: 0, y: -1, z: 0 },      // Index: Down
        { x: 0, y: -1, z: 0 },      // Middle
        { x: 0, y: -1, z: 0 },      // Ring
        { x: 0, y: -1, z: 0 }       // Pinky
    ],

    // B: All fingers Up (+Y), Thumb Tucked (-X)
    'B': [
        { x: -0.8, y: 0.2, z: 0 },  // Thumb: Tucked across
        { x: 0, y: 1, z: 0 },       // Index: Up
        { x: 0, y: 1, z: 0 },       // Middle
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 1, z: 0 }
    ],

    // C: All fingers Curved (+Z/Y), Thumb Curved
    // "Curved" means pointing somewhat Forward (+Z) and Up (+Y)
    'C': [
        { x: 0.5, y: 0.5, z: 0.7 }, // Thumb
        { x: 0, y: 0.5, z: 0.8 },   // Index
        { x: 0, y: 0.5, z: 0.8 },
        { x: 0, y: 0.5, z: 0.8 },
        { x: 0, y: 0.5, z: 0.8 }
    ],

    // D: Index Up, others Circle
    'D': [
        { x: 0.5, y: -0.2, z: 0.8 }, // Thumb: Touching middle (Circle-ish)
        { x: 0, y: 1, z: 0 },        // Index: Up
        { x: 0, y: 0.2, z: 0.9 },    // Middle: Curled/Touching
        { x: 0, y: 0.2, z: 0.9 },
        { x: 0, y: 0.2, z: 0.9 }
    ],

    // L: Index Up, Thumb Out, others Down
    'L': [
        { x: 0.9, y: 0.4, z: 0 },   // Thumb: Out (+X)
        { x: 0.1, y: 0.9, z: 0 },   // Index: Up
        { x: 0, y: -1, z: 0 },      // Middle: Down
        { x: 0, y: -1, z: 0 },
        { x: 0, y: -1, z: 0 }
    ],

    // O: All fingertips meeting (+Z/In)
    'O': [
        { x: 0, y: -0.1, z: 0.9 },  // Thumb
        { x: 0, y: -0.1, z: 0.9 },  // Index
        { x: 0, y: -0.1, z: 0.9 },
        { x: 0, y: -0.1, z: 0.9 },
        { x: 0, y: -0.1, z: 0.9 }
    ],

    // V: Index/Middle Up & Spread, others Down
    'V': [
        { x: -0.8, y: 0, z: 0 },    // Thumb: Tucked
        { x: -0.2, y: 0.9, z: 0 },  // Index: Up/Left
        { x: 0.2, y: 0.9, z: 0 },   // Middle: Up/Right
        { x: 0, y: -1, z: 0 },
        { x: 0, y: -1, z: 0 }
    ],

    // W: Index/Middle/Ring Up & Spread
    'W': [
        { x: -0.8, y: 0, z: 0 },    // Thumb
        { x: -0.3, y: 0.9, z: 0 },  // Index
        { x: 0, y: 1, z: 0 },       // Middle
        { x: 0.3, y: 0.9, z: 0 },   // Ring
        { x: 0, y: -1, z: 0 }       // Pinky
    ],

    // Y: Thumb/Pinky Out, others Down
    'Y': [
        { x: 0.9, y: 0.2, z: 0 },   // Thumb: Out
        { x: 0, y: -1, z: 0 },      // Index
        { x: 0, y: -1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0.8, y: 0.5, z: 0 }    // Pinky: Out/Up
    ],
};
