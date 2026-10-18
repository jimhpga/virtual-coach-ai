export const VCA_3D_RELEASE = {
  id: "v200",
  status: "locked",
  precision: {
    checkpoints: "P1-P9",
    states: [1, 64] as const,
    timingValid: true,
    analyticalMotionMaster: "V197_KINEMATIC_MOTION_MASTER",
  },
  context: {
    checkpoint: "P10",
    states: [65, 77] as const,
    timingValid: false,
    kineticsAllowed: false,
  },
  assets: {
    release: "/vca-3d/v200/release.json",
    contract: "/vca-3d/v200/contract.json",
    sequence: "/vca-3d/v200/sequence.json",
    club: "/vca-3d/v200/club.json",
    faceVideo: "/vca-3d/v200/face.mp4",
    dtlVideo: "/vca-3d/v200/dtl.mp4",
  },
} as const;

export type Vca3dRelease = typeof VCA_3D_RELEASE;
