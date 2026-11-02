import type { Collection } from '../../store/collections/types';
import { getGraphQLBadgeOperation } from '../../helpers/request';

export type DocsNodeKind = 'collection' | 'folder' | 'request';

export type DocsTreeNode = {
  kind: DocsNodeKind;
  id: string;
  name: string;
  collectionId: string;
  markdown: string;
  badge?: string;
  children: DocsTreeNode[];
};

export type DocsSectionData = {
  node: DocsTreeNode;
  level: 1 | 2 | 3;
  crumb?: string;
};

export interface TreeBuilder {
  foldersById: Map<string, DocsTreeNode>;
  nodes: DocsTreeNode[];
}

export function buildDocsTree(collections: Collection[]): DocsTreeNode[] {
  const tree: TreeBuilder = { foldersById: new Map(), nodes: [] };

  for (const collection of collections) {
    const collectionNode: DocsTreeNode = {
      kind: 'collection',
      id: collection.id,
      name: collection.name,
      collectionId: collection.id,
      markdown: collection.description ?? '',
      children: [],
    };

    for (const folder of collection.folders) {
      tree.foldersById.set(folder.id, {
        kind: 'folder',
        id: folder.id,
        name: folder.name,
        collectionId: folder.collectionId,
        markdown: '',
        children: [],
      });
    }

    for (const folder of collection.folders) {
      const parent = folder.parentId ? tree.foldersById.get(folder.parentId) : collectionNode;
      const node = tree.foldersById.get(folder.id);
      if (node && parent) parent.children.push(node);
    }

    const sortedRequests = [...collection.requests].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const request of sortedRequests) {
      const parent = request.folderId ? tree.foldersById.get(request.folderId) : collectionNode;
      if (!parent) continue;
      parent.children.push({
        kind: 'request',
        id: request.id,
        name: request.name,
        collectionId: request.collectionId,
        markdown: request.documentation ?? '',
        badge:
          request.requestType === 'graphql'
            ? getGraphQLBadgeOperation(request.graphql?.document ?? '')
            : request.method,
        children: [],
      });
    }

    tree.nodes.push(collectionNode);
  }

  return tree.nodes;
}

export function buildDocsSections(nodes: DocsTreeNode[]): DocsSectionData[] {
  const sections: DocsSectionData[] = [];
  const walk = (children: DocsTreeNode[], depth: number, path: string[]) => {
    for (const node of children) {
      const level = (node.kind === 'request' ? 3 : Math.min(depth, 3)) as 1 | 2 | 3;
      sections.push({ node, level, crumb: path.length > 0 ? path.join(' / ') : undefined });
      if (node.kind !== 'request') walk(node.children, depth + 1, [...path, node.name]);
    }
  };
  walk(nodes, 1, []);
  return sections;
}
