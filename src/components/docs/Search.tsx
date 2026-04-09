import { useState, useRef, useCallback } from "react";

interface PagefindResult {
  url: string;
  meta: { title: string };
  excerpt: string;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const pagefindRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load Pagefind on first interaction
  const loadPagefind = useCallback(async () => {
    if (pagefindRef.current) return;

    if (import.meta.env.DEV) {
      return;
    }

    try {
      // Pagefind generates its assets at /pagefind/pagefind.js after build
      const modulePath = "/pagefind/pagefind.js";
      pagefindRef.current = await import(/* @vite-ignore */ modulePath);
      await pagefindRef.current.init();
    } catch {
      console.warn("Pagefind not available — run a production build to generate the search index.");
    }
  }, []);

  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      if (!value.trim()) {
        setResults([]);
        return;
      }
      await loadPagefind();
      if (!pagefindRef.current) return;

      const search = await pagefindRef.current.search(value);
      const data = await Promise.all(
        search.results.slice(0, 8).map((r: any) => r.data())
      );
      setResults(data);
    },
    [loadPagefind]
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        placeholder="Search docs..."
        className="docs-search-input"
        value={query}
        onFocus={() => { setIsOpen(true); loadPagefind(); }}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && results.length > 0 && (
        <div className="docs-search-panel">
          {results.map((result, i) => (
            <a
              key={i}
              href={result.url}
              className="docs-search-result"
            >
              <div className="docs-search-result-title">{result.meta.title}</div>
              <div
                className="docs-search-result-snippet"
                dangerouslySetInnerHTML={{ __html: result.excerpt }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
