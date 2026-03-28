import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdvertiserBudgetRiskBanner } from '../AdvertiserBudgetRiskBanner';

describe('AdvertiserBudgetRiskBanner', () => {
  it('analytics mode returns null when count is 0', () => {
    const { container } = render(
      <AdvertiserBudgetRiskBanner mode="analytics" budgetRiskTh={0.85} atRiskCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('analytics mode shows summary when at risk', () => {
    render(
      <AdvertiserBudgetRiskBanner mode="analytics" budgetRiskTh={0.85} atRiskCount={2} />
    );
    expect(screen.getByText(/有 2 个活动在本页样本中已达到预算风险线/)).toBeInTheDocument();
  });

  it('dashboard mode returns null when no campaigns', () => {
    const { container } = render(
      <AdvertiserBudgetRiskBanner
        mode="dashboard"
        budgetRiskTh={0.85}
        campaigns={[]}
        formatCurrency={(n) => String(n)}
        onViewCampaign={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
