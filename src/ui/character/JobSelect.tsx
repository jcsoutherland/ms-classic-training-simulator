import { jobName } from '../../character/jobs';

const INDENT = '   ';
const BRANCHES: [branch: number, jobs: number[]][] = [
  [0, [0]],
  [100, [100, 110, 120, 130]],
  [200, [200, 210, 220, 230]],
  [300, [300, 310, 320]],
  [400, [400, 410, 420]],
];

interface JobSelectProps {
  id: string;
  value: number;
  onChange: (jobId: number) => void;
}

export function JobSelect({ id, value, onChange }: JobSelectProps) {
  return (
    <select id={id} className="job-select" value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {BRANCHES.map(([branch, jobs]) => (
        <optgroup key={branch} label={jobName(branch)}>
          {jobs.map((jobId) => <option key={jobId} value={jobId}>{jobId % 100 === 0 ? jobName(jobId) : `${INDENT}${jobName(jobId)}`}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
