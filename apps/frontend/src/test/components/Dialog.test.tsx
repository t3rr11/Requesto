import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('uses a scrolling padded body by default', () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} title="Test">
        Content
      </Dialog>,
    );
    expect(document.body.querySelector('.p-6.overflow-y-auto')).not.toBeNull();
  });

  it('uses a non-scrolling body when fullBleed is set', () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} title="Test" fullBleed>
        Content
      </Dialog>,
    );
    expect(document.body.querySelector('.flex-1.min-h-0.overflow-hidden')).not.toBeNull();
  });

  it('routes close attempts through onCloseRequest when provided', () => {
    const onCloseRequest = vi.fn();
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose} onCloseRequest={onCloseRequest} title="Test">
        Content
      </Dialog>,
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onCloseRequest).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
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
