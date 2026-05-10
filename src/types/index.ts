/**
 * Yetenek 2.0 — Shared Types
 */

// MediaPipe Pose returns 33 keypoints (BlazePose model)
// Reference: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
export type PoseLandmarkIndex =
  | 0 // nose
  | 1 // left eye inner
  | 2 // left eye
  | 3 // left eye outer
  | 4 // right eye inner
  | 5 // right eye
  | 6 // right eye outer
  | 7 // left ear
  | 8 // right ear
  | 9 // mouth left
  | 10 // mouth right
  | 11 // left shoulder
  | 12 // right shoulder
  | 13 // left elbow
  | 14 // right elbow
  | 15 // left wrist
  | 16 // right wrist
  | 17 // left pinky
  | 18 // right pinky
  | 19 // left index
  | 20 // right index
  | 21 // left thumb
  | 22 // right thumb
  | 23 // left hip
  | 24 // right hip
  | 25 // left knee
  | 26 // right knee
  | 27 // left ankle
  | 28 // right ankle
  | 29 // left heel
  | 30 // right heel
  | 31 // left foot index
  | 32; // right foot index

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type Keypoint = {
  x: number; // 0-1, normalized to image width
  y: number; // 0-1, normalized to image height
  z?: number; // Relative depth (smaller = closer to camera)
  visibility?: number; // 0-1, confidence that point is visible
};

export type PoseFrame = {
  timestamp: number; // ms, performance.now() based
  landmarks: Keypoint[]; // 33 keypoints
  worldLandmarks?: Keypoint[]; // Real-world coordinates (meters), origin at hip center
};

export type TestType =
  | 'jump'
  | 'balance'
  | 'reaction'
  | 'broadJump'
  | 'lateralHops'
  | 'coordination'
  | 'endurance';

// NOT: Eski Result/SessionResult/BioMotorProfile/SportRecommendation/ChildProfile
// tipleri burada vardı; yeni mimari `core/schemas/session.schema.ts` + Zod
// tek-doğruluk-kaynağı kullandığı için silindi. PoseFrame, Keypoint,
// POSE_LANDMARKS, TestType ise pose pipeline tarafından hâlâ aktif.
