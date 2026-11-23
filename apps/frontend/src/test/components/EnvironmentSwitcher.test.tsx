import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvironmentSwitcher } from '../../components/EnvironmentSwitcher';

const mockSetActiveEnvironment = vi.fn();
vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: {
      activeEnvironmentId: 'env-1',
      environments: [
        { id: 'env-1', name: 'Production', variables: [] },
        { id: 'env-2', name: 'Development', variables: [] },
      ],
    },
    setActiveEnvironment: mockSetActiveEnvironment,
    saveEnvironment: vi.fn(),
  }),
}));

describe('EnvironmentSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders switcher with active environment name', () => {
    render(<EnvironmentSwitcher />);
    expect(screen.getByTitle('Environment: Production')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('opens dropdown on click and lists environments', () => {
    render(<EnvironmentSwitcher />);
    fireEvent.click(screen.getByTestId('environment-switcher'));
    expect(screen.getByPlaceholderText('Search environments...')).toBeInTheDocument();
    expect(screen.getByText('No Environment')).toBeInTheDocument();
    expect(screen.getAllByText('Development')).toHaveLength(1); // dropdown row
  });

  it('calls setActiveEnvironment when selecting an environment', () => {
    render(<EnvironmentSwitcher />);
    fireEvent.click(screen.getByTestId('environment-switcher'));
    fireEvent.click(screen.getAllByText('Development')[0]);
    expect(mockSetActiveEnvironment).toHaveBeenCalledWith('env-2');
  });

  it('calls setActiveEnvironment(null) when selecting No Environment', () => {
    render(<EnvironmentSwitcher />);
    fireEvent.click(screen.getByTestId('environment-switcher'));
    fireEvent.click(screen.getByText('No Environment'));
    expect(mockSetActiveEnvironment).toHaveBeenCalledWith(null);
  });
});
