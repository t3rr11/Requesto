import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvironmentList } from '../../components/EnvironmentList';
import type { Environment } from '../../store/environments/types';

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    importEnvironment: vi.fn(),
  }),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: () => ({
    showAlert: vi.fn(),
  }),
}));

describe('EnvironmentList', () => {
  const mockOnSelect = vi.fn();
  const mockOnAdd = vi.fn();

  const environments: Environment[] = [
    { id: 'env-1', name: 'Production', variables: [{ key: 'API_URL', value: 'https://api.prod.com', enabled: true }] },
    { id: 'env-2', name: 'Development', variables: [{ key: 'API_URL', value: 'http://localhost:3000', enabled: true }, { key: 'DEBUG', value: 'true', enabled: true }] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders environment list', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId="env-1"
        selectedEnvironmentId={null}
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('shows variable counts', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId={null}
        selectedEnvironmentId={null}
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    expect(screen.getByText('1 var')).toBeInTheDocument();
    expect(screen.getByText('2 vars')).toBeInTheDocument();
  });

  it('calls onSelect when environment clicked', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId={null}
        selectedEnvironmentId={null}
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    fireEvent.click(screen.getByText('Production'));
    expect(mockOnSelect).toHaveBeenCalledWith('env-1');
  });

  it('shows empty state when no environments', () => {
    render(
      <EnvironmentList
        environments={[]}
        activeEnvironmentId={null}
        selectedEnvironmentId={null}
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    expect(screen.getByText(/No environments yet/)).toBeInTheDocument();
  });

  it('renders header title', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId={null}
        selectedEnvironmentId={null}
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    expect(screen.getByText('Environments')).toBeInTheDocument();
  });
});
