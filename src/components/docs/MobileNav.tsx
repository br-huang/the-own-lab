import { useState } from "react";
import type { SidebarNode } from "@/types/docs";

interface Props {
  sidebar: SidebarNode[];
}

function SidebarTree({ nodes }: { nodes: SidebarNode[] }) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) =>
        node.kind === "link" ? (
          <li key={node.href}>
            <a
              href={node.href}
              className={`block px-3 py-2 rounded text-sm ${
                node.active
                  ? "docs-nav-link docs-nav-link-active"
                  : "docs-nav-link"
              }`}
            >
              {node.title}
            </a>
          </li>
        ) : (
          <li key={node.title}>
            <details open={node.expanded}>
              <summary className="docs-nav-section-mobile">
                {node.title}
              </summary>
              <div className="pl-3">
                <SidebarTree nodes={node.children} />
              </div>
            </details>
          </li>
        )
      )}
    </ul>
  );
}

export default function MobileNav({ sidebar }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="docs-icon-button"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
      >
        <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="docs-mobile-panel"
          role="dialog"
          aria-label="Navigation menu"
        >
          <nav>
            <SidebarTree nodes={sidebar} />
          </nav>
        </div>
      )}
    </>
  );
}
