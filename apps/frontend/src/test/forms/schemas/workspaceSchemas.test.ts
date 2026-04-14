import { describe, it, expect } from 'vitest';
import { createWorkspaceSchema, renameWorkspaceSchema } from '../../../forms/schemas/workspaceSchemas';

describe('createWorkspaceSchema', () => {
  it('accepts valid workspace name', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'My Workspace' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createWorkspaceSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = createWorkspaceSchema.safeParse({ name: '  Spaced  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Spaced');
    }
  });

  it('accepts whitespace-only name (trimmed after min check)', () => {
    const result = createWorkspaceSchema.safeParse({ name: '   ' });
    // Zod .min(1) runs before .trim(), so '   ' (length 3) passes min check
    expect(result.success).toBe(true);
  });

  it('accepts without clone fields', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });

  it('accepts clone disabled with no repoUrl', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Test',
      cloneFromRepo: false,
      repoUrl: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts clone enabled with valid repoUrl', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Cloned',
      cloneFromRepo: true,
      repoUrl: 'https://github.com/user/repo.git',
    });
    expect(result.success).toBe(true);
  });

  it('rejects clone enabled with empty repoUrl', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Cloned',
      cloneFromRepo: true,
      repoUrl: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const repoUrlError = result.error.issues.find(i => i.path.includes('repoUrl'));
      expect(repoUrlError?.message).toBe('Repository URL is required when cloning');
    }
  });

  it('rejects clone enabled with whitespace-only repoUrl', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Cloned',
      cloneFromRepo: true,
      repoUrl: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional authToken', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Private',
      cloneFromRepo: true,
      repoUrl: 'https://github.com/user/repo.git',
      authToken: 'ghp_abc123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty authToken', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Public',
      cloneFromRepo: true,
      repoUrl: 'https://github.com/user/repo.git',
      authToken: '',
    });
    expect(result.success).toBe(true);
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
