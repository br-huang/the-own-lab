import { useState, useRef, useCallback } from 'react';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from 'ui';

interface PagefindResult {
  url: string;
  meta: { title: string };
  excerpt: string;
}

export default function Search() {
  const [query, setQuery] = useState('');
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
      const modulePath = '/pagefind/pagefind.js';
      pagefindRef.current = await import(/* @vite-ignore */ modulePath);
      await pagefindRef.current.init();
    } catch {
      console.warn('Pagefind not available — run a production build to generate the search index.');
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
      const data = await Promise.all(search.results.slice(0, 8).map((r: any) => r.data()));
      setResults(data);
    },
    [loadPagefind],
  );

  return (
    <div className="relative w-full">
      <Command shouldFilter={false} className="overflow-visible border border-input bg-card shadow-xs">
        <CommandInput
          ref={inputRef}
          placeholder="Search docs..."
          value={query}
          onFocus={() => {
            setIsOpen(true);
            loadPagefind();
          }}
          onValueChange={handleSearch}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
        {isOpen && (
          <CommandList className="absolute top-full z-50 mt-1 max-h-80 w-full rounded-lg border border-line-soft bg-popover shadow-popover">
            {query.trim() ? <CommandEmpty>No results found.</CommandEmpty> : null}
            {results.map((result, i) => (
              <CommandItem
                key={`${result.url}-${i}`}
                value={result.meta.title}
                onSelect={() => {
                  window.location.href = result.url;
                }}
                className="items-start border-b border-line-soft px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{result.meta.title}</div>
                  <div
                    className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: result.excerpt }}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
