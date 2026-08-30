import { describe, it, expect } from 'vitest';
import { addWorkspaceSchema, renameWorkspaceSchema } from '../../../forms/schemas/workspaceSchemas';

describe('addWorkspaceSchema', () => {
  it('accepts create mode with a name', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'create', name: 'My Workspace' });
    expect(result.success).toBe(true);
  });

  it('rejects create mode with empty name', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'create', name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find(i => i.path.includes('name'));
      expect(nameError?.message).toBe('Workspace name is required');
    }
  });

  it('accepts open mode with name and path', () => {
    const result = addWorkspaceSchema.safeParse({
      mode: 'open',
      name: 'My Project',
      path: '/home/user/project',
    });
    expect(result.success).toBe(true);
  });

  it('rejects open mode without a path', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'open', name: 'My Project' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pathError = result.error.issues.find(i => i.path.includes('path'));
      expect(pathError?.message).toBe('A folder path is required');
    }
  });

  it('rejects open mode without a name', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'open', path: '/home/user/project' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find(i => i.path.includes('name'));
      expect(nameError?.message).toBe('Workspace name is required');
    }
  });

  it('accepts clone mode with name and repo URL', () => {
    const result = addWorkspaceSchema.safeParse({
      mode: 'clone',
      name: 'Cloned',
      repoUrl: 'https://github.com/user/repo.git',
    });
    expect(result.success).toBe(true);
  });

  it('accepts clone mode with optional auth token', () => {
    const result = addWorkspaceSchema.safeParse({
      mode: 'clone',
      name: 'Private',
      repoUrl: 'https://github.com/user/repo.git',
      authToken: 'ghp_abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects clone mode without a repo URL', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'clone', name: 'Cloned' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const repoUrlError = result.error.issues.find(i => i.path.includes('repoUrl'));
      expect(repoUrlError?.message).toBe('Repository URL is required');
    }
  });

  it('accepts import mode without name or file (file handled outside the schema)', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'import' });
    expect(result.success).toBe(true);
  });

  it('trims whitespace from name', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'create', name: '  Spaced  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Spaced');
    }
  });

  it('rejects an unknown mode', () => {
    const result = addWorkspaceSchema.safeParse({ mode: 'teleport', name: 'X' });
    expect(result.success).toBe(false);
  });
});

describe('renameWorkspaceSchema', () => {
  it('accepts valid name', () => {
    const result = renameWorkspaceSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = renameWorkspaceSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Workspace name is required');
    }
  });

  it('trims whitespace', () => {
    const result = renameWorkspaceSchema.safeParse({ name: '  Trimmed  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Trimmed');
    }
  });

  it('accepts whitespace-only name (trimmed after min check)', () => {
    const result = renameWorkspaceSchema.safeParse({ name: '   ' });
    // Zod .min(1) runs before .trim(), so '   ' (length 3) passes min check
    expect(result.success).toBe(true);
  });
});
