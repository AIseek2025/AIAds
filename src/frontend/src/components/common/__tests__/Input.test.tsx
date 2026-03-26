import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('应该渲染输入框', () => {
    render(<Input label="用户名" />);
    
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
  });

  it('应该处理输入事件', () => {
    const handleChange = vi.fn();
    render(<Input label="邮箱" onChange={handleChange} />);
    
    const input = screen.getByLabelText('邮箱');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('test@example.com');
  });

  it('应该显示错误状态', () => {
    render(<Input label="邮箱" error helperText="邮箱格式不正确" />);
    
    const input = screen.getByLabelText('邮箱');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('邮箱格式不正确')).toBeInTheDocument();
  });

  it('应该支持密码类型', () => {
    render(<Input label="密码" type="password" />);
    
    const input = screen.getByLabelText('密码');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('应该支持 placeholder', () => {
    render(<Input label="邮箱" placeholder="请输入邮箱" />);
    
    const input = screen.getByLabelText('邮箱');
    expect(input).toHaveAttribute('placeholder', '请输入邮箱');
  });

  it('应该支持 disabled 状态', () => {
    render(<Input label="邮箱" disabled />);
    
    const input = screen.getByLabelText('邮箱');
    expect(input).toBeDisabled();
  });

  it('应该支持 endAdornment', () => {
    render(<Input label="密码" endAdornment={<span data-testid="adornment">👁</span>} />);
    
    expect(screen.getByTestId('adornment')).toBeInTheDocument();
  });

  it('应该支持 startAdornment', () => {
    render(<Input label="搜索" startAdornment={<span data-testid="adornment">🔍</span>} />);
    
    expect(screen.getByTestId('adornment')).toBeInTheDocument();
  });

  it('应该支持 autoComplete', () => {
    render(<Input label="邮箱" autoComplete="email" />);
    
    const input = screen.getByLabelText('邮箱');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('应该支持 required', () => {
    render(<Input label="邮箱" required />);
    
    const input = screen.getByLabelText('邮箱');
    expect(input).toHaveAttribute('required');
  });

  it('应该支持 fullWidth', () => {
    const { container } = render(<Input label="邮箱" fullWidth />);
    
    expect(container.querySelector('.MuiFormControl-fullWidth')).toBeInTheDocument();
  });

  it('应该支持 size 属性', () => {
    const { container: small } = render(<Input label="小" size="small" />);
    const { container: medium } = render(<Input label="中" size="medium" />);
    
    expect(small.querySelector('.MuiInputBase-sizeSmall')).toBeInTheDocument();
    expect(medium.querySelector('.MuiInputBase-sizeMedium')).toBeInTheDocument();
  });
});
