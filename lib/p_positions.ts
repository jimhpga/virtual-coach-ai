export type PPositionId = "P1"|"P2"|"P3"|"P4"|"P5"|"P6"|"P7"|"P8"|"P9"|"P10";

export type PPosition = {
  id: PPositionId;
  label: string;
  description: string;
};

const DATA: Record<PPositionId, PPosition> = {
  "P1": { id: "P1", label: "Setup", description: "Setup (Address position)\nAthletic posture with a neutral spine and slight hip hinge.\nPressure balanced under the feet (often slightly favoring the lead side).\nArms hang naturally; no reaching or crowding.\nClubface square to the intended start line.\nGrip and posture you can repeat under pressure.\nPurpose: Create a stable, repeatable starting position that doesnâ€™t require timing later." },
  "P2": { id: "P2", label: "Shaft Parallel (Backswing)", description: "Shaft Parallel (Backswing)\nClub, hands, and chest move together early (one-piece takeaway).\nShaft parallel to the ground with the clubhead outside the hands or on-plane.\nClubface roughly matches spine angle (not rolled open or shut).\nTrail hip begins to load without sway.\nPurpose: Establish structure and direction without manipulating the clubface." },
  "P3": { id: "P3", label: "Lead Arm Parallel (Backswing)", description: "Lead Arm Parallel (Backswing)\nLead arm parallel to the ground with width maintained.\nHands stay in front of the chest (not trapped behind).\nShoulder turn continues while posture stays intact.\nPressure continues loading into the trail side.\nPurpose: Build coil and width without losing connection or balance." },
  "P4": { id: "P4", label: "Top", description: "Top of Swing\nTurn is completed without collapsing the arms.\nLead wrist stable; clubface controlled.\nTrail elbow points more down than behind.\nPressure centered or slightly favoring trail side (ready to shift).\nPurpose: Reach a top position you can start down from without rerouting." },
  "P5": { id: "P5", label: "Lead Arm Parallel (Downswing)", description: "Lead Arm Parallel (Downswing)\nPressure has shifted toward the lead side before the arms drop.\nHips begin opening while the chest stays slightly closed.\nHands work down in front of the body (no over-the-top throw).\nPosture maintained; no early stand-up.\nPurpose: Sequence the downswing from the ground up." },
  "P6": { id: "P6", label: "Shaft Parallel (Downswing)", description: "Shaft Parallel (Downswing)\nShaft parallel to the ground with the handle leading the clubhead.\nClub approaching from the inside.\nLead wrist flat or slightly bowed (not flipping).\nTrail elbow in front of the trail hip.\nMajority of pressure now on the lead side.\nPurpose: Deliver the club with control, not timing." },
  "P7": { id: "P7", label: "Impact", description: "Impact\nPressure firmly on the lead side with the lead leg bracing.\nHands ahead of the clubhead (irons).\nClubface square relative to path and start line.\nChest and hips open; posture maintained.\nPurpose: Strike the ball first with compression and predictable start direction." },
  "P8": { id: "P8", label: "Shaft Parallel (Follow-Through)", description: "Shaft Parallel (Follow-Through)\nArms extend through impact.\nBody rotation controls the release (not the hands).\nChest continues turning toward the target.\nTrail foot releasing naturally.\nPurpose: Prove the ball wasnâ€™t hit with a flip." },
  "P9": { id: "P9", label: "Trail Arm Parallel (Follow-Through)", description: "Trail Arm Parallel (Follow-Through)\nTrail arm extended; club exits left around the body.\nBalance fully on the lead side.\nHead and torso free to release with rotation.\nSpeed continues past impact.\nPurpose: Confirm full release and rotational control." },
  "P10": { id: "P10", label: "Finish", description: "Finish\nFully rotated, tall, and balanced.\nWeight entirely on the lead side.\nTrail foot on the toe.\nFinish can be held comfortably.\nPurpose: A balanced finish confirms the swing was controlled and repeatable." },
};

export function getPPosition(id: PPositionId): PPosition {
  return DATA[id];
}

export function allPPositions(): PPosition[] {
  return Object.values(DATA);
}