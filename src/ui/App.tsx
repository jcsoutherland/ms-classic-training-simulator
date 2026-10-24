import { jobName } from '../character/jobs';
import { imageUrl } from '../data/loadGameData';
import { CharacterPage } from './character/CharacterPage';
import { RankingsPage } from './rankings/RankingsPage';
import { routeHref, type Page } from './routes';
import { SiteProvider, useSite } from './SiteContext';
import { TrainPage } from './train/TrainPage';
import { useRoute } from './useRoute';

const NAV: { page: Page; label: string }[] = [
  { page: 'character', label: 'Your character' },
  { page: 'train', label: 'Train on a map' },
  { page: 'rankings', label: 'Best maps for you' },
];

export function App() {
  return (
    <SiteProvider>
      <Shell />
    </SiteProvider>
  );
}

function Shell() {
  const route = useRoute();
  const { character } = useSite();
  const mainAttack = Object.entries(character.attackMix).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    <>
      <header className="bar">
        <div className="wrap bar-inner">
          <a className="brand" href={routeHref({ page: 'character', mapId: null })}>Classic Training Simulator</a>
          <nav className="nav" aria-label="Main">
            {NAV.map((item) => (
              <a key={item.page} href={routeHref({ page: item.page, mapId: null })} aria-current={route.page === item.page ? 'page' : undefined}>{item.label}</a>
            ))}
          </nav>
          <a className="who" href={routeHref({ page: 'character', mapId: null })}>
            {mainAttack && mainAttack !== '0' ? <img className="pixel" src={imageUrl(`img/skills/${mainAttack}/icon.png`)} alt="" /> : <span className="who-blank" />}
            <span><b>{character.name}</b><small>Level {character.level} {jobName(character.jobId)}</small></span>
          </a>
        </div>
      </header>
      {route.page === 'character' && <CharacterPage />}
      {route.page === 'train' && <TrainPage key={route.mapId ?? 'default'} mapId={route.mapId} />}
      {route.page === 'rankings' && <RankingsPage />}
    </>
  );
}
