import { beforeEach, describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { WorkspaceService } from '../../services/workspace.service';
import type { WorkspaceRepository } from '../../repositories/workspace.repository';

function mockRepo(): WorkspaceRepository {
  return {
    open: vi.fn(),
  } as unknown as WorkspaceRepository;
}

describe('WorkspaceService.inspect', () => {
  let dir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-inspect-'));
  });

  it('reports a missing directory', async () => {
    const service = new WorkspaceService(mockRepo());
    const result = await service.inspect(path.join(dir, 'missing'));

    expect(result.exists).toBe(false);
    expect(result.isDirectory).toBe(false);
    expect(result.hasRequestoData).toBe(false);
    expect(result.suggestedName).toBe('missing');
  });

  it('reports a file that is not a directory', async () => {
    const filePath = path.join(dir, 'file.txt');
    fs.writeFileSync(filePath, 'hello');
    const service = new WorkspaceService(mockRepo());

    const result = await service.inspect(filePath);

    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(false);
    expect(result.hasRequestoData).toBe(false);
  });

  it('detects a Requesto workspace and counts its data', async () => {
    const requestoDir = path.join(dir, 'project-a', '.requesto');
    fs.mkdirSync(requestoDir, { recursive: true });
    fs.writeFileSync(
      path.join(requestoDir, 'collections.json'),
      JSON.stringify([{ id: 'c1' }, { id: 'c2' }]),
    );
    fs.writeFileSync(
      path.join(requestoDir, 'environments.json'),
      JSON.stringify({ activeEnvironmentId: null, environments: [{ id: 'e1' }] }),
    );
    fs.writeFileSync(
      path.join(requestoDir, 'oauth-configs.json'),
      JSON.stringify({ configs: [{ id: 'o1' }] }),
    );
    const service = new WorkspaceService(mockRepo());

    const result = await service.inspect(path.join(dir, 'project-a'));

    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.hasRequestoData).toBe(true);
    expect(result.counts).toEqual({ collections: 2, environments: 1, oauthConfigs: 1 });
    expect(result.suggestedName).toBe('project-a');
  });

  it('detects a legacy root-level layout', async () => {
    const legacyDir = path.join(dir, 'legacy');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'collections.json'), JSON.stringify([{ id: 'c1' }]));
    const service = new WorkspaceService(mockRepo());

    const result = await service.inspect(legacyDir);

    expect(result.hasRequestoData).toBe(true);
    expect(result.counts.collections).toBe(1);
  });

  it('reports an empty directory without Requesto data', async () => {
    const emptyDir = path.join(dir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const service = new WorkspaceService(mockRepo());

    const result = await service.inspect(emptyDir);

    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.hasRequestoData).toBe(false);
    expect(result.counts).toEqual({ collections: 0, environments: 0, oauthConfigs: 0 });
  });
});

describe('WorkspaceService.open', () => {
  it('maps repository errors to badRequest AppError', async () => {
    const repo = mockRepo();
    (repo.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Directory does not exist: /nope');
    });
    const service = new WorkspaceService(repo);

    expect(service.open('Test', '/nope')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Directory does not exist: /nope',
    });
  });
});
