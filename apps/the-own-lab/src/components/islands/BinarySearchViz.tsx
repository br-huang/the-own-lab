import AlgoVisualizer from './AlgoVisualizer';
import ParamDemo from './ParamDemo';
import type { AlgoStep } from '@/types/docs';

// ─── AlgoVisualizer: Binary Search Step-Through ───

const binarySearchSteps: AlgoStep[] = [
  { label: 'Start', data: { array: [1, 3, 5, 7, 9, 11], lo: 0, hi: 5, mid: 2, target: 7 } },
  { label: 'Go right', data: { array: [1, 3, 5, 7, 9, 11], lo: 3, hi: 5, mid: 4, target: 7 } },
  { label: 'Go left', data: { array: [1, 3, 5, 7, 9, 11], lo: 3, hi: 3, mid: 3, target: 7 } },
  { label: 'Found!', data: { array: [1, 3, 5, 7, 9, 11], lo: 3, hi: 3, mid: 3, target: 7 } },
];

function StepView({ step }: { step: AlgoStep }) {
  const data = step.data as {
    array: number[];
    lo: number;
    hi: number;
    mid: number;
    target: number;
  };
  return (
    <div className="font-mono text-sm text-foreground">
      <div className="viz-row">
        {data.array.map((val, i) => {
          let cls = 'viz-cell ';
          if (i === data.mid) cls += 'viz-cell-mid';
          else if (i >= data.lo && i <= data.hi) cls += 'viz-cell-range';
          else cls += 'viz-cell-rest';
          return (
            <div key={i} className={cls}>
              {val}
            </div>
          );
        })}
      </div>
      <div className="viz-meta">
        Target: {data.target} | lo: {data.lo} | hi: {data.hi} | mid: {data.mid}
      </div>
    </div>
  );
}

export function BinarySearchAlgoViz() {
  return (
    <AlgoVisualizer
      steps={binarySearchSteps}
      autoPlayInterval={1000}
      render={(step) => <StepView step={step} />}
    />
  );
}

// ─── ParamDemo: Array Size Comparison ───

export function BinarySearchParamDemo() {
  return (
    <ParamDemo
      params={{
        size: {
          type: 'number',
          default: 10,
          min: 1,
          max: 1000,
          step: 1,
          label: 'Array size (n)',
        },
      }}
      render={(values) => {
        const size = Number(values.size) || 1;
        return (
          <div className="font-mono text-sm text-foreground">
            <p>Array size: {size}</p>
            <p>Max comparisons (log₂ n): {Math.ceil(Math.log2(size))}</p>
            <p>Linear search comparisons: {size}</p>
          </div>
        );
      }}
    />
  );
}
