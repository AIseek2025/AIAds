import {
  resetPrismaMemory,
  seedOrderFrozenForAdvertiser,
  seedOrderFrozenForCampaign,
  seedOrderFrozenForKol,
} from './prisma-memory';
import {
  sumFrozenAmountForAdvertiser,
  sumFrozenAmountForAdvertisers,
  sumFrozenAmountForCampaign,
  sumFrozenAmountForCampaigns,
  sumFrozenAmountForKol,
  sumFrozenAmountForKols,
} from '../src/services/order-frozen.util';

describe('order-frozen.util（prisma-memory）', () => {
  beforeEach(() => {
    resetPrismaMemory();
  });

  it('sumFrozenAmountForKol 读取种子合计', async () => {
    seedOrderFrozenForKol('kol-a', 150);
    await expect(sumFrozenAmountForKol('kol-a')).resolves.toBe(150);
  });

  it('sumFrozenAmountForKol 无种子为 0', async () => {
    await expect(sumFrozenAmountForKol('kol-x')).resolves.toBe(0);
  });

  it('sumFrozenAmountForKols 批量合并并对无数据 KOL 为 0', async () => {
    seedOrderFrozenForKol('k1', 10);
    seedOrderFrozenForKol('k2', 25);
    const m = await sumFrozenAmountForKols(['k1', 'k2', 'k3']);
    expect(m.get('k1')).toBe(10);
    expect(m.get('k2')).toBe(25);
    expect(m.get('k3')).toBe(0);
  });

  it('sumFrozenAmountForKols 空 id 列表不查库语义', async () => {
    const m = await sumFrozenAmountForKols([]);
    expect(m.size).toBe(0);
  });

  it('sumFrozenAmountForCampaign 读取种子合计', async () => {
    seedOrderFrozenForCampaign('camp-a', 88.5);
    await expect(sumFrozenAmountForCampaign('camp-a')).resolves.toBe(88.5);
  });

  it('sumFrozenAmountForCampaign 无种子为 0', async () => {
    await expect(sumFrozenAmountForCampaign('camp-x')).resolves.toBe(0);
  });

  it('sumFrozenAmountForCampaigns 批量合并并对无数据活动为 0', async () => {
    seedOrderFrozenForCampaign('c1', 12);
    seedOrderFrozenForCampaign('c2', 3);
    const m = await sumFrozenAmountForCampaigns(['c1', 'c2', 'c3']);
    expect(m.get('c1')).toBe(12);
    expect(m.get('c2')).toBe(3);
    expect(m.get('c3')).toBe(0);
  });

  it('sumFrozenAmountForCampaigns 空 id 列表', async () => {
    const m = await sumFrozenAmountForCampaigns([]);
    expect(m.size).toBe(0);
  });

  it('sumFrozenAmountForAdvertiser 读取种子合计', async () => {
    seedOrderFrozenForAdvertiser('adv-1', 199);
    await expect(sumFrozenAmountForAdvertiser('adv-1')).resolves.toBe(199);
  });

  it('sumFrozenAmountForAdvertiser 无种子为 0', async () => {
    await expect(sumFrozenAmountForAdvertiser('adv-x')).resolves.toBe(0);
  });

  it('sumFrozenAmountForAdvertisers 批量合并并对无数据广告主为 0', async () => {
    seedOrderFrozenForAdvertiser('a1', 40);
    seedOrderFrozenForAdvertiser('a2', 2.5);
    const m = await sumFrozenAmountForAdvertisers(['a1', 'a2', 'a3']);
    expect(m.get('a1')).toBe(40);
    expect(m.get('a2')).toBe(2.5);
    expect(m.get('a3')).toBe(0);
  });

  it('sumFrozenAmountForAdvertisers 空 id 列表', async () => {
    const m = await sumFrozenAmountForAdvertisers([]);
    expect(m.size).toBe(0);
  });
});
