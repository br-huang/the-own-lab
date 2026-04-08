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
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              {node.title}
            </a>
          </li>
        ) : (
          <li key={node.title}>
            <details open={node.expanded}>
              <summary className="px-3 py-2 text-sm font-semibold cursor-pointer">
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
        className="p-2 text-gray-700 hover:bg-gray-100 rounded"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 top-14 z-40 bg-white overflow-y-auto p-4"
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
