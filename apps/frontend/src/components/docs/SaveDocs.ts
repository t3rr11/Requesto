import type { DocsSectionData } from './DocsTreeHelpers';

type DocsSaveActions = {
  updateRequest: (collectionId: string, requestId: string, updates: { documentation: string }) => Promise<unknown> | unknown;
};

/**
 * Persists every staged markdown diff, skipping unchanged documents and
 * aborting after the first failure.
 *
 * @returns true when every staged document was persisted.
 */
export async function saveStagedDocs(
  sections: DocsSectionData[],
  staged: Map<string, string>,
  actions: DocsSaveActions,
): Promise<boolean> {
  for (const [nodeId, markdown] of staged) {
    const section = sections.find(candidate => candidate.node.id === nodeId);
    if (!section || section.node.markdown === markdown) continue;
    try {
      await actions.updateRequest(section.node.collectionId, section.node.id, { documentation: markdown });
    } catch {
      return false;
    }
  }
  return true;
}
