// ============================================================================
//  ⚠️  LEGACY — QR/marker-based AR.js prototype (AR.js + A-Frame + .patt files).
//  NOT used by the new markerless workflow engine. The primary AR experience
//  is now pages/ARExperience.jsx + components/ar/{CameraFeed,ARAnchor,
//  GuidancePanel}.jsx, driven by hooks/useProcedureSession.js and normalized
//  ML perception coordinates instead of a physical marker.
//
//  Retained (not deleted) per migration instructions in case anything still
//  depends on it, and as a reference for the old interaction model. Safe to
//  remove once nobody imports it — this file is currently unreferenced by
//  any page or route.
// ============================================================================
// src/components/ar/OverlayObjects.jsx
// ============================================================================
//  Reusable A-Frame overlay primitives that can sit inside an <a-marker>.
//
//  Each primitive is a tiny wrapper around <a-entity> that emits the right
//  geometry/material props. Keeping these as React components means the AR
//  scene markup stays declarative and easy to read.
// ============================================================================

import { DEFAULT_COLORS } from './arConfig';

// ---------- HighlightCircle ------------------------------------------------
//  Pulsing ring that draws attention to a point on the marker.
export const HighlightCircle = ({
  position = '0 0.01 0',
  radius = 0.6,
  color = DEFAULT_COLORS.highlight,
  pulse = true
}) => (
  <a-entity position={position}>
    <a-ring
      color={color}
      radius-inner={radius * 0.85}
      radius-outer={radius}
      rotation="-90 0 0"
      material={`opacity: 0.85; transparent: true; shader: flat; color: ${color}`}
      animation__pulse={
        pulse
          ? 'property: scale; from: 1 1 1; to: 1.25 1.25 1.25; dur: 900; dir: alternate; loop: true; easing: easeInOutSine'
          : undefined
      }
    />
  </a-entity>
);

// ---------- DirectionalArrow ----------------------------------------------
//  3D arrow pointing at a target spot. Hover-floats to feel alive.
export const DirectionalArrow = ({
  position = '0 0.6 0',
  rotation = '0 0 0',
  color = DEFAULT_COLORS.arrow,
  bob = true
}) => {
  const [x, y, z] = position.split(' ');
  const bobTarget = `${x} ${parseFloat(y) + 0.15} ${z}`;

  return (
    <a-entity
      position={position}
      rotation={rotation}
      animation__bob={
        bob
          ? `property: position; from: ${position}; to: ${bobTarget}; dur: 1100; dir: alternate; loop: true; easing: easeInOutSine`
          : undefined
      }
    >
      {/* Shaft */}
      <a-cylinder
        color={color}
        height="0.6"
        radius="0.06"
        position="0 0 0"
        material={`shader: flat; color: ${color}`}
      />
      {/* Tip */}
      <a-cone
        color={color}
        height="0.3"
        radius-bottom="0.16"
        radius-top="0"
        position="0 -0.45 0"
        rotation="180 0 0"
        material={`shader: flat; color: ${color}`}
      />
    </a-entity>
  );
};

// ---------- FloatingText ---------------------------------------------------
//  Text panel that hovers above the marker. Rotated -90° on X so it faces
//  the webcam when the marker is shown flat toward the camera.
export const FloatingText = ({
  position = '0 1.4 0',
  text = '',
  color = DEFAULT_COLORS.text,
  bgColor = DEFAULT_COLORS.textBg,
  width = 3.2
}) => (
  <a-entity position={position} rotation="-90 0 0" scale="1.5 1.5 1.5">
    {/* Backing plane */}
    <a-plane
      width={width}
      height="0.7"
      color={bgColor}
      material={`opacity: 0.92; transparent: true; shader: flat; color: ${bgColor}`}
    />
    {/* Border accent */}
    <a-plane
      width={width + 0.08}
      height="0.78"
      color={DEFAULT_COLORS.highlight}
      position="0 0 -0.001"
      material={`opacity: 0.6; transparent: true; shader: flat; color: ${DEFAULT_COLORS.highlight}`}
    />
    <a-text
      value={text}
      align="center"
      color={color}
      width={width * 1.8}
      position="0 0 0.01"
      wrap-count="32"
      anchor="center"
      baseline="center"
    />
  </a-entity>
);

// ---------- StepBadge ------------------------------------------------------
//  Small 3D tile showing the current step number above the marker.
export const StepBadge = ({
  position = '0 2.2 0',
  number = 1,
  color = DEFAULT_COLORS.highlight
}) => (
  <a-entity position={position} rotation="-90 0 0" scale="1.5 1.5 1.5">
    <a-circle
      radius="0.38"
      color={color}
      material={`shader: flat; color: ${color}`}
    />
    <a-text
      value={`${number}`}
      align="center"
      color="#FFFFFF"
      width="3.5"
      position="0 0 0.01"
      anchor="center"
      baseline="center"
    />
  </a-entity>
);
