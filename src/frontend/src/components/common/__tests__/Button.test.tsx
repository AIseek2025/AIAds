import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('应该渲染按钮', () => {
    render(<Button>点击</Button>);
    
    const button = screen.getByRole('button', { name: '点击' });
    expect(button).toBeInTheDocument();
  });

  it('应该处理点击事件', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点击</Button>);
    
    const button = screen.getByRole('button', { name: '点击' });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('应该显示加载状态', () => {
    render(<Button loading>加载中</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('加载中...');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('应该禁用按钮当 loading 为 true', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>点击</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('应该支持不同尺寸', () => {
    const { container: small } = render(<Button size="small">小</Button>);
    const { container: medium } = render(<Button size="medium">中</Button>);
    const { container: large } = render(<Button size="large">大</Button>);
    
    expect(small.querySelector('.MuiButton-sizeSmall')).toBeInTheDocument();
    expect(medium.querySelector('.MuiButton-sizeMedium')).toBeInTheDocument();
    expect(large.querySelector('.MuiButton-sizeLarge')).toBeInTheDocument();
  });

  it('应该支持不同颜色变体', () => {
    const { container: primary } = render(<Button color="primary">主色</Button>);
    const { container: secondary } = render(<Button color="secondary">次要</Button>);
    const { container: error } = render(<Button color="error">错误</Button>);
    
    expect(primary.querySelector('.MuiButton-colorPrimary')).toBeInTheDocument();
    expect(secondary.querySelector('.MuiButton-colorSecondary')).toBeInTheDocument();
    expect(error.querySelector('.MuiButton-colorError')).toBeInTheDocument();
  });

  it('应该支持 fullWidth 属性', () => {
    const { container } = render(<Button fullWidth>全宽</Button>);
    
    expect(container.querySelector('.MuiButton-fullWidth')).toBeInTheDocument();
  });

  it('应该支持 disabled 属性', () => {
    render(<Button disabled>禁用</Button>);
    
    const button = screen.getByRole('button', { name: '禁用' });
    expect(button).toBeDisabled();
  });

  it('应该渲染 startIcon', () => {
    render(<Button startIcon={<span data-testid="icon">🔍</span>}>搜索</Button>);
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('应该渲染 endIcon', () => {
    render(<Button endIcon={<span data-testid="icon">→</span>}>下一步</Button>);
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
