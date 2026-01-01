// src/lib/VectorMath.ts

export type Point3D = { x: number; y: number; z: number };

export const VectorMath = {
    // Create vector from A to B
    sub: (a: Point3D, b: Point3D): Point3D => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),

    // Distance between two points
    dist: (a: Point3D, b: Point3D): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),

    // Normalize a vector to length 1
    normalize: (v: Point3D): Point3D => {
        const mag = Math.hypot(v.x, v.y, v.z) || 1;
        return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    },

    // Dot Product (Similarity between two vectors: -1 to 1)
    dot: (a: Point3D, b: Point3D): number => a.x * b.x + a.y * b.y + a.z * b.z,

    // Cross Product (Find perpendicular vector)
    cross: (a: Point3D, b: Point3D): Point3D => ({
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    })
};
