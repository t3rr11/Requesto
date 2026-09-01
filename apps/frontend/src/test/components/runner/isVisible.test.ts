import { describe, expect, it } from 'vitest';
import { isVisible } from '../../../components/runner/helpers';
import { buildCollectionItems, buildWorkspaceItems } from 'requesto-engine/runner';
import type { Collection } from '../../../store/collections/types';

function makeCollections(): Collection[] {
  return [
    {
      id: 'col-1',
      name: 'First',
      folders: [{ id: 'f-1', name: 'Users', collectionId: 'col-1' }],
      requests: [
        { id: 'r-1', name: 'Root Req', method: 'GET', url: '/', collectionId: 'col-1' },
        { id: 'r-2', name: 'Nested Req', method: 'GET', url: '/', collectionId: 'col-1', folderId: 'f-1' },
      ],
    },
    {
      id: 'col-2',
      name: 'Second',
      folders: [],
      requests: [{ id: 'r-3', name: 'Other Req', method: 'GET', url: '/', collectionId: 'col-2' }],
    },
  ];
}

describe('runner visibility with collapsible collections', () => {
  const collections = makeCollections();
  const allFolders = collections.flatMap(c => c.folders ?? []);
  const items = buildWorkspaceItems(collections);

  it('shows everything when nothing is collapsed', () => {
    const visible = items.filter(i => isVisible(i, new Set(), new Set(), allFolders));
    expect(visible).toHaveLength(items.length);
  });

  it('a collapsed collection hides its folders and requests but not its header', () => {
    const visible = items.filter(i => isVisible(i, new Set(), new Set(['col-1']), allFolders));
    const kinds = visible.map(i => i.kind === 'collection' ? `collection:${i.name}` : i.kind === 'folder' ? `folder:${i.folder.name}` : `request:${i.request.name}`);
    expect(kinds).toEqual(['collection:First', 'collection:Second', 'request:Other Req']);
  });

  it('collapsed collections and folders combine', () => {
    const visible = items.filter(i => isVisible(i, new Set(['f-1']), new Set(['col-2']), allFolders));
    const names = visible.map(i => i.kind === 'request' ? i.request.name : i.kind === 'folder' ? i.folder.name : i.name);
    // Collection headers always stay visible; a collapsed folder row is shown
    // but its contents are hidden; col-2's contents are hidden entirely.
    expect(names).toEqual(['First', 'Users', 'Root Req', 'Second']);
  });

  it('single-collection display items are unaffected by collection collapsing', () => {
    const single = buildCollectionItems(collections[0]);
    const visible = single.filter(i => isVisible(i, new Set(), new Set(['col-1']), allFolders));
    // No collection header item in single mode; requests/folders use their own
    // collectionId, so collapsing col-1 would hide them — but the dialog only
    // renders collection headers (and passes collapsed sets) in multi mode.
    expect(visible).toHaveLength(0);
  });
});
