import type { ReactNode } from 'react';

// ─── _meta.ts Schema ───

export interface MetaItem {
  /** Display title override. If omitted, derived from filename. */
  title?: string;
  /** Explicit sort order. Lower numbers appear first. */
  order?: number;
}

export interface MetaConfig {
  /** Display name for this folder itself in the sidebar. */
  label?: string;
  /** Map of child slug (filename without extension, or subfolder name) → display overrides. */
  items: Record<string, MetaItem>;
}

// ─── Sidebar Tree ───

export interface SidebarLink {
  kind: 'link';
  title: string;
  href: string;
  order: number;
  /** True if this link matches the current page. */
  active: boolean;
}

export interface SidebarSection {
  kind: 'section';
  title: string;
  order: number;
  children: SidebarNode[];
  /** True if any descendant is active. */
  expanded: boolean;
}

export type SidebarNode = SidebarLink | SidebarSection;

// ─── TOC ───

export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

// ─── Interactive Component Props ───

export interface CodePlaygroundProps {
  files: Record<string, string>;
  template?: 'react-ts' | 'react' | 'vanilla-ts' | 'vanilla';
  showPreview?: boolean;
}

export interface ParamDef {
  type: 'number' | 'boolean' | 'select';
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  label?: string;
}

export interface ParamDemoProps {
  params: Record<string, ParamDef>;
  children: (values: Record<string, number | boolean | string>) => ReactNode;
}

export interface AlgoStep {
  label?: string;
  data: Record<string, unknown>;
}

export interface AlgoVisualizerProps {
  steps: AlgoStep[];
  autoPlayInterval?: number | null;
  children: (step: AlgoStep, index: number) => ReactNode;
}
