/**
 * KOL 关键词检索可解释排序（规则分，非向量/ES）。
 * 用于 `GET /api/v1/kols` 带 keyword 时在**当前结果页**内按相关度优先展示。
 */

export type KolKeywordSearchRank = {
  score: number;
  matched_fields: string[];
};

type KolFieldsForRank = {
  platformUsername: string;
  platformDisplayName: string | null;
  bio: string | null;
  category: string | null;
};

function fieldScore(name: string, value: string | null | undefined, kw: string): { score: number; hit: boolean } {
  if (!value) {
    return { score: 0, hit: false };
  }
  const v = value.toLowerCase();
  let score = 0;
  if (v === kw) {
    if (name === 'username') {
      score = 100;
    } else if (name === 'display_name') {
      score = 95;
    } else if (name === 'category') {
      score = 72;
    } else {
      score = 55;
    }
  } else if (v.startsWith(kw)) {
    if (name === 'username') {
      score = 85;
    } else if (name === 'display_name') {
      score = 78;
    } else if (name === 'category') {
      score = 58;
    } else {
      score = 45;
    }
  } else if (v.includes(kw)) {
    if (name === 'username') {
      score = 70;
    } else if (name === 'display_name') {
      score = 62;
    } else if (name === 'category') {
      score = 48;
    } else {
      score = 35;
    }
  }
  return { score, hit: score > 0 };
}

/**
 * 计算单条 KOL 与关键词的规则相关度；多字段命中时有小幅加成（可解释）。
 */
export function computeKolKeywordRank(row: KolFieldsForRank, rawKw: string): KolKeywordSearchRank {
  const kw = rawKw.trim().toLowerCase();
  if (!kw) {
    return { score: 0, matched_fields: [] };
  }

  const checks: Array<{ name: string; value: string | null }> = [
    { name: 'username', value: row.platformUsername },
    { name: 'display_name', value: row.platformDisplayName },
    { name: 'bio', value: row.bio },
    { name: 'category', value: row.category },
  ];

  let best = 0;
  const matched: string[] = [];

  for (const { name, value } of checks) {
    const { score, hit } = fieldScore(name, value, kw);
    if (hit) {
      matched.push(name);
      if (score > best) {
        best = score;
      }
    }
  }

  const multiBonus = Math.min(matched.length * 3, 15);
  return { score: best + multiBonus, matched_fields: matched };
}
