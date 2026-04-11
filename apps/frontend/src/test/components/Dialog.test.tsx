import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogFooter } from '../../components/Dialog';

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Dialog isOpen={false} onClose={() => {}} title="Test">
        Content
      </Dialog>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title and content when open', () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} title="My Dialog">
        <p>Body content</p>
      </Dialog>,
    );
    expect(screen.getByText('My Dialog')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} title="Test" footer={<button>Save</button>}>
        Content
      </Dialog>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('has close button', () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} title="Test">
        Content
      </Dialog>,
    );
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});

describe('DialogFooter', () => {
  it('renders children in a flex container', () => {
    render(
      <DialogFooter>
        <button>Cancel</button>
        <button>OK</button>
      </DialogFooter>,
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });
});
