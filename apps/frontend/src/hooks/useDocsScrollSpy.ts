import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocsSectionData, DocsTreeNode } from '../components/docs/DocsTreeHelpers';

/**
 * Scroll spy for a continuous reading view: registers anchor sections and maps
 * the scroll position back to the active section id for the navigation tree.
 */
export function useDocsScrollSpy(sections: DocsSectionData[]) {
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollFrameRef = useRef<number | null>(null);

  const registerSection = useCallback((nodeId: string, element: HTMLDivElement | null) => {
    if (element) sectionRefs.current.set(nodeId, element);
    else sectionRefs.current.delete(nodeId);
  }, []);

  const scrollToSection = useCallback((nodeId: string) => {
    const element = sectionRefs.current.get(nodeId);
    if (!element) return false;
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      const container = contentRef.current;
      if (container) container.scrollTop = element.offsetTop;
    }
    return true;
  }, []);

  const handleNavigate = useCallback(
    (node: DocsTreeNode) => {
      setActiveId(node.id);
      scrollToSection(node.id);
    },
    [scrollToSection],
  );

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const container = contentRef.current;
      if (!container) return;
      const containerTop = container.getBoundingClientRect().top;
      const passed = sections.filter(section => {
        const element = sectionRefs.current.get(section.node.id);
        return element && element.getBoundingClientRect().top - containerTop <= 8;
      });
      const active = passed[passed.length - 1]?.node.id ?? sections[0]?.node.id ?? null;
      setActiveId(previous => (previous === active ? previous : active));
    });
  }, [sections]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  return { contentRef, activeId, setActiveId, registerSection, handleNavigate, scrollToSection, handleScroll };
}
