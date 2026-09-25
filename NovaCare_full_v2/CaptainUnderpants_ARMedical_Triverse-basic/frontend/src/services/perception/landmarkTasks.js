// src/services/perception/landmarkTasks.js
// ============================================================================
//  Thin loader around @mediapipe/tasks-vision. Pretrained models only — no
//  training happens anywhere in this app. Each landmarker is created once
//  and cached (they're a few MB each and slow to spin up), then reused
//  across workflow steps and even across separate guided sessions.
//
//  Models used (all Apache-2.0, Google's public model CDN):
//    - PoseLandmarker (BlazePose, 33 keypoints)  — Phase 2 (BP measurement)
//    - FaceLandmarker (478 pts + head-pose matrix) — Phases 5a/5b (face/head)
//    - HandLandmarker (21 pts)                    — Phases 5a/5b (fingertip)
// ============================================================================
import {
  FilesetResolver,
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker
} from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';

const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let _filesetPromise = null;
const getFileset = () => {
  if (!_filesetPromise) {
    _filesetPromise = FilesetResolver.forVisionTasks(WASM_BASE);
  }
  return _filesetPromise;
};

// One cached instance per landmarker type — reused across every workflow
// step and every session for as long as the tab stays open.
const _cache = { pose: null, face: null, hand: null };

export async function getPoseLandmarker() {
  if (_cache.pose) return _cache.pose;
  const vision = await getFileset();
  _cache.pose = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1
  });
  return _cache.pose;
}

export async function getFaceLandmarker() {
  if (_cache.face) return _cache.face;
  const vision = await getFileset();
  _cache.face = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFacialTransformationMatrixes: true
  });
  return _cache.face;
}

export async function getHandLandmarker() {
  if (_cache.hand) return _cache.hand;
  const vision = await getFileset();
  _cache.hand = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2
  });
  return _cache.hand;
}

// Which landmarkers a given workflow needs, so RealPerceptionService only
// loads what it actually uses.
export const WORKFLOW_LANDMARKERS = {
  bp_measurement: ['pose'],
  eye_drops: ['face', 'hand'],
  nasal_spray: ['face', 'hand'],
  glucose_measurement: ['hand'],
  nebulizer: ['face', 'hand'],
  wound_dressing: ['hand']
};
