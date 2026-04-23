import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvironmentHeader } from '../../components/EnvironmentHeader';
import type { Environment } from '../../store/environments/types';

const mockSetActiveEnvironment = vi.fn();
const mockDeleteEnvironment = vi.fn();
const mockExportEnvironment = vi.fn();
const mockAddEnvironment = vi.fn();

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: {
      activeEnvironmentId: 'env-1',
      environments: [],
    },
    setActiveEnvironment: mockSetActiveEnvironment,
    deleteEnvironment: mockDeleteEnvironment,
    addEnvironment: mockAddEnvironment,
    exportEnvironment: mockExportEnvironment,
  }),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: () => ({
    showAlert: vi.fn(),
  }),
}));

describe('EnvironmentHeader', () => {
  const mockOnSave = vi.fn();
  const mockOnNameChange = vi.fn();

  const environment: Environment = {
    id: 'env-1',
    name: 'Production',
    variables: [{ key: 'API_URL', value: 'https://api.prod.com', enabled: true }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders environment name', () => {
    render(
      <EnvironmentHeader
        environment={environment}
        hasChanges={false}
        onSave={mockOnSave}
        onNameChange={mockOnNameChange}
      />,
    );
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('shows active badge', () => {
    render(
      <EnvironmentHeader
        environment={environment}
        hasChanges={false}
        onSave={mockOnSave}
        onNameChange={mockOnNameChange}
      />,
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows unsaved indicator when has changes', () => {
    render(
      <EnvironmentHeader
        environment={environment}
        hasChanges={true}
        onSave={mockOnSave}
        onNameChange={mockOnNameChange}
      />,
    );
    expect(screen.getByText('(unsaved)')).toBeInTheDocument();
  });

  it('shows save button when has changes', () => {
    render(
      <EnvironmentHeader
        environment={environment}
        hasChanges={true}
        onSave={mockOnSave}
        onNameChange={mockOnNameChange}
      />,
    );
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);
    expect(mockOnSave).toHaveBeenCalledOnce();
  });

  it('opens rename dialog from the menu', () => {
    render(
      <EnvironmentHeader
        environment={environment}
        hasChanges={false}
        onSave={mockOnSave}
        onNameChange={mockOnNameChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /environment menu/i }));
    fireEvent.click(screen.getByText('Rename'));
    // RenameForm dialog opens with current name pre-filled
    expect(screen.getByDisplayValue('Production')).toBeInTheDocument();
  });

  it('opens dropdown menu', () => {
    render(
      <EnvironmentHeader
        environment={environment}
        hasChanges={false}
        onSave={mockOnSave}
        onNameChange={mockOnNameChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /environment menu/i }));
    // Menu should show options
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });
});
