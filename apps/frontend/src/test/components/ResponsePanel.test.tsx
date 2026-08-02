import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsePanel } from '../../components/ResponsePanel';
import type { ProxyResponse } from '../../store/request/types';

const mockResponse: ProxyResponse = {
  status: 200,
  statusText: 'OK',
  headers: { 'Content-Type': 'application/json' },
  body: '{"message":"hello"}',
  bodyEncoding: 'utf8',
  duration: 150,
};

describe('ResponsePanel', () => {
  it('shows empty state when no response', () => {
    render(<ResponsePanel response={null} loading={false} error={null} isDarkMode={false} />);
    expect(screen.getByText('Send a request to see the response')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ResponsePanel response={null} loading={true} error={null} isDarkMode={false} />);
    expect(screen.getByText('Sending Request')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <ResponsePanel
        response={null}
        loading={false}
        error="Connection refused"
        isDarkMode={false}
      />,
    );
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  it('renders response with status badge', () => {
    render(
      <ResponsePanel response={mockResponse} loading={false} error={null} isDarkMode={false} />,
    );
    expect(screen.getByText('200 OK')).toBeInTheDocument();
    expect(screen.getByText(/150ms/)).toBeInTheDocument();
  });

  it('shows response body editor by default', () => {
    const { container } = render(
      <ResponsePanel response={mockResponse} loading={false} error={null} isDarkMode={false} />,
    );
    // Monaco Editor renders asynchronously; verify the editor container is present
    expect(container.querySelector('[data-testid="monaco-editor-container"], section')).toBeInTheDocument();
  });

  it('switches to headers tab', async () => {
    const user = userEvent.setup();
    render(
      <ResponsePanel response={mockResponse} loading={false} error={null} isDarkMode={false} />,
    );
    await user.click(screen.getByText('Headers'));
    expect(screen.getByText('Content-Type')).toBeInTheDocument();
    expect(screen.getByText('application/json')).toBeInTheDocument();
  });

  it('switches to test results tab', async () => {
    const user = userEvent.setup();
    render(
      <ResponsePanel response={mockResponse} loading={false} error={null} isDarkMode={false} />,
    );
    await user.click(screen.getByText('Test Results'));
    expect(screen.getByText('No tests defined')).toBeInTheDocument();
  });

  it('shows all three tab options', () => {
    render(
      <ResponsePanel response={mockResponse} loading={false} error={null} isDarkMode={false} />,
    );
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Headers')).toBeInTheDocument();
    expect(screen.getByText('Test Results')).toBeInTheDocument();
  });

  it('shows partial GraphQL responses and structured errors', async () => {
    const user = userEvent.setup();
    const graphqlResponse: ProxyResponse = {
      ...mockResponse,
      body: JSON.stringify({
        data: { user: null },
        errors: [{
          message: 'User is unavailable',
          path: ['user'],
          locations: [{ line: 2, column: 3 }],
        }],
      }),
    };
    render(
      <ResponsePanel
        response={graphqlResponse}
        loading={false}
        error={null}
        isDarkMode={false}
        isGraphQL
      />,
    );

    expect(screen.getByText('Partial data')).toBeInTheDocument();
    await user.click(screen.getByText('Errors (1)'));
    expect(screen.getByText('User is unavailable')).toBeInTheDocument();
    expect(screen.getByText('Path: user')).toBeInTheDocument();
    expect(screen.getByText('Line 2, column 3')).toBeInTheDocument();
  });

  it('does not interpret ordinary JSON errors as GraphQL', () => {
    render(
      <ResponsePanel response={mockResponse} loading={false} error={null} isDarkMode={false} />,
    );

    expect(screen.queryByText(/GraphQL errors/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Errors \(/)).not.toBeInTheDocument();
  });
});
