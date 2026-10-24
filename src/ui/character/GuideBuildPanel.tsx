import { useState } from 'react';
import { defaultCharacter } from '../../character/defaults';
import { JOB_IDS, jobName, minimumLevel } from '../../character/jobs';
import type { Character } from '../../character/types';
import type { SiteData } from '../../data/loadGameData';

interface GuideBuildPanelProps {
  draft: Character;
  site: SiteData;
  onUse: (character: Character) => void;
}

export function GuideBuildPanel({ draft, site, onUse }: GuideBuildPanelProps) {
  const [jobId, setJobId] = useState(draft.jobId);
  const [levelText, setLevelText] = useState(String(draft.level));
  const level = Math.min(100, Math.max(minimumLevel(jobId), Math.round(Number(levelText) || minimumLevel(jobId))));
  const guide = site.guides.find((candidate) => candidate.jobId === jobId) ?? site.guides.find((candidate) => candidate.jobId === Math.floor(jobId / 100) * 100);
  const use = () => {
    const built = defaultCharacter(jobId, level, { data: site.game, guides: site.guides, items: site.itemList });
    onUse({ ...built, id: draft.id, name: draft.name, gender: draft.gender, expPercent: draft.expPercent });
  };
  return (
    <section className="panel" aria-labelledby="guide-heading">
      <h2 id="guide-heading">Start from a guide build</h2>
      <p className="hint">Pick a job and level to fill everything in from MeowDB's class guides. Your screenshots or your own numbers replace any part of it.</p>
      <div className="fields spaced">
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="guide-job">Job</label>
          <select id="guide-job" value={jobId} onChange={(event) => setJobId(Number(event.target.value))}>
            {JOB_IDS.map((id) => <option key={id} value={id}>{jobName(id)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="guide-level">Level</label>
          <input id="guide-level" type="number" inputMode="numeric" min={minimumLevel(jobId)} max={100} value={levelText}
            onChange={(event) => setLevelText(event.target.value)} onBlur={() => setLevelText(String(level))} />
        </div>
      </div>
      <div className="form-actions">
        <button className="button" type="button" onClick={use}>Use this build</button>
        {guide && <a className="button ghost" href={guide.url} target="_blank" rel="noreferrer">Read the {jobName(guide.jobId)} guide</a>}
      </div>
      {level > 70 && <p className="hint">The guides stop at level 70, so stat points past 70 go into your main stat and extra skill points stay unspent.</p>}
    </section>
  );
}
