import { describe, expect, it } from 'vitest';
import { followLink } from './items';

const root = {
  '02040000': { info: { icon: { picture: 'lesser scroll' } } },
  '02041024': { info: { icon: { __uol: '../../02040000/info/icon' } } },
};

describe('followLink', () => {
  it('finds the shared picture a scroll links to', () => {
    expect(followLink(root, ['02041024', 'info'], root['02041024'].info.icon)).toEqual({ picture: 'lesser scroll' });
  });

  it('leaves a picture that is not a link as it is', () => {
    expect(followLink(root, ['02040000', 'info'], root['02040000'].info.icon)).toEqual({ picture: 'lesser scroll' });
  });
});
