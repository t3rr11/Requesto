import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvironmentSelector, EnvironmentSelectorCompact } from '../../components/EnvironmentSelector';
import { MemoryRouter } from 'react-router';

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

describe('EnvironmentSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders select with current environment', () => {
    render(<EnvironmentSelector />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('env-1');
  });

  it('renders all environment options', () => {
    render(<EnvironmentSelector />);
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('No Environment')).toBeInTheDocument();
  });

  it('calls setActiveEnvironment on change', () => {
    render(<EnvironmentSelector />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'env-2' } });
    expect(mockSetActiveEnvironment).toHaveBeenCalledWith('env-2');
  });
});

describe('EnvironmentSelectorCompact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders compact selector with environment name', () => {
    render(
      <MemoryRouter>
        <EnvironmentSelectorCompact />
      </MemoryRouter>,
    );
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(
      <MemoryRouter>
        <EnvironmentSelectorCompact />
      </MemoryRouter>,
    );
    const trigger = screen.getByText('Production');
    fireEvent.click(trigger);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});
