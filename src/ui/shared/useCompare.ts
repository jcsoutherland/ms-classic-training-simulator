import { useMemo } from 'react';
import { defaultCharacter } from '../../character/defaults';
import { JOB_IDS, jobName, minimumLevel } from '../../character/jobs';
import type { Character } from '../../character/types';
import { useSite } from '../SiteContext';
import { useStoredState } from './storedState';

export interface CompareChoice {
  value: string;
  label: string;
}

export interface CompareState {
  compared: Character | null;
  choice: string;
  savedChoices: CompareChoice[];
  jobChoices: CompareChoice[];
  choose: (value: string) => void;
}

const SAVED = 'saved:';
const JOB = 'job:';

export function useCompare(): CompareState {
  const { site, characters, character } = useSite();
  const [choice, choose] = useStoredState('compare', '');
  const compared = useMemo(() => {
    if (choice.startsWith(SAVED)) return characters.find((saved) => saved.id === choice.slice(SAVED.length) && saved.id !== character.id) ?? null;
    if (!choice.startsWith(JOB)) return null;
    const jobId = Number(choice.slice(JOB.length));
    if (!JOB_IDS.includes(jobId) || minimumLevel(jobId) > character.level) return null;
    const built = defaultCharacter(jobId, character.level, { data: site.game, guides: site.guides, items: site.itemList });
    return { ...built, id: choice, name: `${jobName(jobId)} ${character.level}` };
  }, [choice, characters, character, site]);
  const savedChoices = characters
    .filter((saved) => saved.id !== character.id)
    .map((saved) => ({ value: SAVED + saved.id, label: `${saved.name}, level ${saved.level} ${jobName(saved.jobId)}` }));
  const jobChoices = JOB_IDS
    .filter((jobId) => jobId !== character.jobId && minimumLevel(jobId) <= character.level)
    .map((jobId) => ({ value: JOB + jobId, label: `${jobName(jobId)}, level ${character.level} (guide build)` }));
  return { compared, choice: compared ? choice : '', savedChoices, jobChoices, choose };
}
