import { computeKolKeywordRank } from '../src/utils/kolSearchRank';

describe('computeKolKeywordRank', () => {
  it('username exact match scores higher than bio contains', () => {
    const exact = computeKolKeywordRank(
      {
        platformUsername: 'beauty_shop',
        platformDisplayName: null,
        bio: 'beauty tips',
        category: '美妆',
      },
      'beauty_shop'
    );
    const partial = computeKolKeywordRank(
      {
        platformUsername: 'other_user',
        platformDisplayName: null,
        bio: 'beauty tips daily',
        category: '生活',
      },
      'beauty'
    );
    expect(exact.score).toBeGreaterThan(partial.score);
    expect(exact.matched_fields).toContain('username');
  });

  it('bio contains match records bio field', () => {
    const r = computeKolKeywordRank(
      {
        platformUsername: 'u99',
        platformDisplayName: null,
        bio: 'daily tech reviews and gadgets',
        category: '生活',
      },
      'tech'
    );
    expect(r.score).toBeGreaterThan(0);
    expect(r.matched_fields).toContain('bio');
  });

  it('empty keyword returns zero score', () => {
    const r = computeKolKeywordRank(
      {
        platformUsername: 'a',
        platformDisplayName: 'b',
        bio: 'c',
        category: 'd',
      },
      '   '
    );
    expect(r.score).toBe(0);
    expect(r.matched_fields).toHaveLength(0);
  });

  it('display_name exact match scores and records display_name', () => {
    const r = computeKolKeywordRank(
      {
        platformUsername: 'u1',
        platformDisplayName: 'beauty_lab',
        bio: 'other',
        category: '生活',
      },
      'beauty_lab'
    );
    expect(r.score).toBeGreaterThan(0);
    expect(r.matched_fields).toContain('display_name');
  });

  it('display_name prefix match scores below username exact for same keyword string', () => {
    const displayStart = computeKolKeywordRank(
      {
        platformUsername: 'other',
        platformDisplayName: 'beauty_shop_official',
        bio: 'x',
        category: '生活',
      },
      'beauty'
    );
    const usernameExact = computeKolKeywordRank(
      {
        platformUsername: 'beauty',
        platformDisplayName: null,
        bio: 'x',
        category: '生活',
      },
      'beauty'
    );
    expect(usernameExact.score).toBeGreaterThan(displayStart.score);
  });

  it('username prefix match scores below username exact', () => {
    const exact = computeKolKeywordRank(
      {
        platformUsername: 'beauty',
        platformDisplayName: null,
        bio: 'x',
        category: '生活',
      },
      'beauty'
    );
    const prefix = computeKolKeywordRank(
      {
        platformUsername: 'beauty_shop',
        platformDisplayName: null,
        bio: 'x',
        category: '生活',
      },
      'beauty'
    );
    expect(exact.score).toBeGreaterThan(prefix.score);
  });

  it('category exact match ranks above bio-only contains for same keyword', () => {
    const categoryStrong = computeKolKeywordRank(
      {
        platformUsername: 'u1',
        platformDisplayName: null,
        bio: '美妆日常',
        category: '美妆',
      },
      '美妆'
    );
    const bioOnly = computeKolKeywordRank(
      {
        platformUsername: 'u2',
        platformDisplayName: null,
        bio: '美妆日常',
        category: '生活',
      },
      '美妆'
    );
    expect(categoryStrong.score).toBeGreaterThan(bioOnly.score);
    expect(categoryStrong.matched_fields).toContain('category');
  });
});
