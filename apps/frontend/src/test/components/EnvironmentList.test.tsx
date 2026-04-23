import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { EnvironmentList } from '../../components/EnvironmentList';
import type { Environment } from '../../store/environments/types';

const mockSetActiveEnvironment = vi.fn();
const mockDeleteEnvironment = vi.fn();
const mockAddEnvironment = vi.fn();
const mockSaveEnvironment = vi.fn();
const mockExportEnvironment = vi.fn();
const mockImportEnvironment = vi.fn();
const mockShowAlert = vi.fn();

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    importEnvironment: mockImportEnvironment,
    exportEnvironment: mockExportEnvironment,
    setActiveEnvironment: mockSetActiveEnvironment,
    deleteEnvironment: mockDeleteEnvironment,
    addEnvironment: mockAddEnvironment,
    saveEnvironment: mockSaveEnvironment,
  }),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: () => ({ showAlert: mockShowAlert }),
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

  it('opens a context menu with all expected items on right-click', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId="env-1"
        selectedEnvironmentId="env-1"
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Development'));
    expect(screen.getByText('Set Active')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows "Deactivate" when right-clicking the active environment', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId="env-1"
        selectedEnvironmentId="env-1"
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Production'));
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('calls setActiveEnvironment when "Set Active" is chosen on an inactive env', async () => {
    mockSetActiveEnvironment.mockResolvedValueOnce(undefined);
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId="env-1"
        selectedEnvironmentId="env-1"
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Development'));
    await act(async () => {
      fireEvent.click(screen.getByText('Set Active'));
    });
    expect(mockSetActiveEnvironment).toHaveBeenCalledWith('env-2');
  });

  it('opens the rename dialog with the current name pre-filled', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId="env-1"
        selectedEnvironmentId="env-1"
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Development'));
    fireEvent.click(screen.getByText('Rename'));
    expect(screen.getByDisplayValue('Development')).toBeInTheDocument();
  });

  it('confirms and then deletes when "Delete" is chosen', async () => {
    mockDeleteEnvironment.mockResolvedValueOnce(undefined);
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId="env-1"
        selectedEnvironmentId="env-1"
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Development'));
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText(/Are you sure you want to delete "Development"/)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(mockDeleteEnvironment).toHaveBeenCalledWith('env-2');
  });

  it('calls onAdd when the New Environment header button is clicked', () => {
    render(
      <EnvironmentList
        environments={environments}
        activeEnvironmentId={null}
        selectedEnvironmentId={null}
        onSelect={mockOnSelect}
        onAdd={mockOnAdd}
      />,
    );
    fireEvent.click(screen.getByTitle('New Environment'));
    expect(mockOnAdd).toHaveBeenCalledOnce();
  });
});
