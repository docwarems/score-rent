import { ScoreType } from "../models/Score";

export const SIGNATURE_ALL = { id: "ALL", name: "Alle"}; 

export async function getScoreTypes() {
  const signatures = [SIGNATURE_ALL];
  const scoreTypes = await ScoreType.find();
  for (const scoreType of scoreTypes) {
    signatures.push({
      id: scoreType.signature,
      name: `${scoreType.composer} ${scoreType.work}`,
    });
  }
  return signatures;
}
