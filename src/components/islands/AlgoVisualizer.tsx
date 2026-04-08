import { useState, useEffect, useRef, useCallback } from "react";
import type { AlgoStep } from "@/types/docs";
import type { ReactNode } from "react";

interface Props {
  steps: AlgoStep[];
  autoPlayInterval?: number | null;
  /** Render prop — use this in MDX instead of children (MDX does not support function-as-children). */
  render: (step: AlgoStep, index: number) => ReactNode;
  children?: never;
}

export default function AlgoVisualizer({
  steps,
  autoPlayInterval = null,
  render,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[currentIndex];

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, totalSteps - 1)));
    },
    [totalSteps]
  );

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    if (isPlaying && autoPlayInterval) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((i) => {
          if (i >= totalSteps - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, autoPlayInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, autoPlayInterval, totalSteps]);

  if (totalSteps === 0) return <div className="text-gray-500 text-sm">No steps to visualize.</div>;

  return (
    <div className="my-6 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          aria-label="Previous step"
        >
          Prev
        </button>

        {autoPlayInterval && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        )}

        <button
          onClick={next}
          disabled={currentIndex === totalSteps - 1}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          aria-label="Next step"
        >
          Next
        </button>

        <span className="ml-auto text-xs text-gray-500">
          Step {currentIndex + 1} / {totalSteps}
          {currentStep.label && ` — ${currentStep.label}`}
        </span>
      </div>

      <div>{render(currentStep, currentIndex)}</div>
    </div>
  );
}
