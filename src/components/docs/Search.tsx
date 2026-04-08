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
    try {
      // Pagefind generates its assets at /pagefind/pagefind.js after build
      pagefindRef.current = await import(
        /* @vite-ignore */ "/pagefind/pagefind.js"
      );
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
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={query}
        onFocus={() => { setIsOpen(true); loadPagefind(); }}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((result, i) => (
            <a
              key={i}
              href={result.url}
              className="block px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-gray-900">{result.meta.title}</div>
              <div
                className="text-gray-500 text-xs mt-0.5 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: result.excerpt }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
