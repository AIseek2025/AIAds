import request from 'supertest';
import app from '../src/app';

describe('Health API', () => {
  it('GET /api/v1/health 返回 ok 与运行时间', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      status: 'ok',
      version: expect.any(String),
    });
    expect(typeof res.body.data.timestamp).toBe('string');
    expect(typeof res.body.data.uptime).toBe('number');
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.data.version).toBeDefined();
  });

  it('GET /api/v1/public/ui-config 返回展示用阈值（无需鉴权）', async () => {
    const res = await request(app).get('/api/v1/public/ui-config').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      budget_risk_threshold: expect.any(Number),
      low_balance_alert_cny: expect.any(Number),
      kol_accept_frequency: {
        enabled: expect.any(Boolean),
        rolling_days: expect.any(Number),
        max_accepts: expect.any(Number),
      },
    });
  });
});
