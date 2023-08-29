import { ScoreType } from "../models/Score";

export async function getScoreTypes() {
  const signatures = [{ id: "ALL", name: "Alle" }];
  const scoreTypes = await ScoreType.find();
  for (const scoreType of scoreTypes) {
    signatures.push({
      id: scoreType.signature,
      name: `${scoreType.composer} ${scoreType.work}`,
    });
  }
  return signatures;
}
