import { JOB_IDS, branchOf } from '../../character/jobs';

const FIRST_ADVANCEMENT = 10;
const SECOND_ADVANCEMENT = 30;

export function advancementChoices(jobId: number, goalLevel: number): number[] {
  if (jobId === 0 && goalLevel > SECOND_ADVANCEMENT) return JOB_IDS.filter((id) => id % 100 !== 0);
  if (jobId === 0 && goalLevel > FIRST_ADVANCEMENT) return JOB_IDS.filter((id) => id !== 0 && id % 100 === 0);
  if (jobId % 100 === 0 && goalLevel > SECOND_ADVANCEMENT) return JOB_IDS.filter((id) => id % 100 !== 0 && branchOf(id) === jobId);
  return [];
}
