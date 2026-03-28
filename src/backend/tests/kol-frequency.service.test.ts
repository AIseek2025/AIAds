import {
  getKolAcceptFrequencyConfig,
  windowStartDate,
} from '../src/services/kol-frequency.service';

const ENV_KEYS = [
  'KOL_ACCEPT_FREQ_ENABLED',
  'KOL_ACCEPT_ROLLING_DAYS',
  'KOL_MAX_ACCEPTS_ROLLING_WINDOW',
] as const;

describe('kol-frequency.service', () => {
  const snapshot: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      const v = snapshot[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('getKolAcceptFrequencyConfig uses defaults when env unset', () => {
    const cfg = getKolAcceptFrequencyConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.rollingDays).toBe(7);
    expect(cfg.maxAccepts).toBe(30);
  });

  it('getKolAcceptFrequencyConfig reads env', () => {
    process.env.KOL_ACCEPT_FREQ_ENABLED = 'false';
    process.env.KOL_ACCEPT_ROLLING_DAYS = '14';
    process.env.KOL_MAX_ACCEPTS_ROLLING_WINDOW = '5';
    const cfg = getKolAcceptFrequencyConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.rollingDays).toBe(14);
    expect(cfg.maxAccepts).toBe(5);
  });

  it('rollingDays 0 or negative string coerces to 1', () => {
    process.env.KOL_ACCEPT_ROLLING_DAYS = '0';
    expect(getKolAcceptFrequencyConfig().rollingDays).toBe(1);
    process.env.KOL_ACCEPT_ROLLING_DAYS = '-2';
    expect(getKolAcceptFrequencyConfig().rollingDays).toBe(1);
  });

  it('rollingDays NaN env falls back to default 7', () => {
    process.env.KOL_ACCEPT_ROLLING_DAYS = 'not-a-number';
    expect(getKolAcceptFrequencyConfig().rollingDays).toBe(7);
  });

  it('maxAccepts NaN env falls back to default 30', () => {
    process.env.KOL_MAX_ACCEPTS_ROLLING_WINDOW = 'nan';
    expect(getKolAcceptFrequencyConfig().maxAccepts).toBe(30);
  });

  it('windowStartDate is local midnight and rollingDays before today', () => {
    const rollingDays = 7;
    const d = windowStartDate(rollingDays);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);

    const expected = new Date();
    expected.setDate(expected.getDate() - rollingDays);
    expected.setHours(0, 0, 0, 0);
    expect(d.getTime()).toBe(expected.getTime());
  });
});
