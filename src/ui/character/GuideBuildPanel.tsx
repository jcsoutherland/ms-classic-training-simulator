import { useEffect, useState } from 'react';
import { defaultCharacter } from '../../character/defaults';
import { withGenderFromGear } from '../../character/gear';
import { jobName, minimumLevel } from '../../character/jobs';
import type { Character } from '../../character/types';
import type { SiteData } from '../../data/loadGameData';
import { JobSelect } from './JobSelect';

interface GuideBuildPanelProps {
  draft: Character;
  site: SiteData;
  onUse: (character: Character) => void;
}

export function GuideBuildPanel({ draft, site, onUse }: GuideBuildPanelProps) {
  const [jobId, setJobId] = useState(draft.jobId);
  const [levelText, setLevelText] = useState(String(draft.level));
  useEffect(() => {
    setJobId(draft.jobId);
    setLevelText(String(draft.level));
  }, [draft.jobId, draft.level]);
  const level = Math.min(100, Math.max(minimumLevel(jobId), Math.round(Number(levelText) || minimumLevel(jobId))));
  const guide = site.guides.find((candidate) => candidate.jobId === jobId) ?? site.guides.find((candidate) => candidate.jobId === Math.floor(jobId / 100) * 100);
  const use = () => {
    const built = defaultCharacter(jobId, level, { data: site.game, guides: site.guides, items: site.itemList });
    onUse(withGenderFromGear({ ...built, id: draft.id, name: draft.name, gender: draft.gender, expPercent: draft.expPercent }));
  };
  return (
    <section className="panel guide" aria-labelledby="guide-heading">
      <h2 id="guide-heading">Start from a guide build</h2>
      <div className="guide-fields">
        <div className="field">
          <label htmlFor="guide-job">Job</label>
          <JobSelect id="guide-job" value={jobId} onChange={setJobId} />
        </div>
        <div className="field">
          <label htmlFor="guide-level">Level</label>
          <input id="guide-level" type="number" inputMode="numeric" min={minimumLevel(jobId)} max={100} value={levelText}
            onChange={(event) => setLevelText(event.target.value)} onBlur={() => setLevelText(String(level))} />
        </div>
      </div>
      <div className="guide-actions">
        <button className="button" type="button" onClick={use}>Use this build</button>
        {guide && <a className="button ghost" href={guide.url} target="_blank" rel="noreferrer">{jobName(guide.jobId)} guide</a>}
      </div>
      {level > 70 && <p className="hint">Guides stop at 70: later stat points go to your main stat.</p>}
    </section>
  );
}
