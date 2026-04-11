import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarPanel } from '../../components/SidebarPanel';

describe('SidebarPanel', () => {
  it('renders title', () => {
    render(<SidebarPanel title="Collections">Items here</SidebarPanel>);
    expect(screen.getByText('Collections')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<SidebarPanel title="Test"><p>Content</p></SidebarPanel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders header actions', () => {
    render(
      <SidebarPanel title="Test" headerActions={<button>Add</button>}>
        Content
      </SidebarPanel>,
    );
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <SidebarPanel title="Test" isLoading>
        <p>Hidden</p>
      </SidebarPanel>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});
