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

  if (totalSteps === 0) return <div className="interactive-empty">No steps to visualize.</div>;

  return (
    <div className="interactive-shell p-4">
      <div className="interactive-toolbar">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="button-secondary"
          aria-label="Previous step"
        >
          Prev
        </button>

        {autoPlayInterval && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="button-secondary"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        )}

        <button
          onClick={next}
          disabled={currentIndex === totalSteps - 1}
          className="button-secondary"
          aria-label="Next step"
        >
          Next
        </button>

        <span className="interactive-meta">
          Step {currentIndex + 1} / {totalSteps}
          {currentStep.label && ` - ${currentStep.label}`}
        </span>
      </div>

      <div>{render(currentStep, currentIndex)}</div>
    </div>
  );
}
