import { createCube, createSlidePath } from '@/lib/isometric';

// Isometric text skew (same as your SVG, without the translation part)
const ISO_TEXT = 'matrix(1.732274,-0.717531,1.53591,1.075456,0,0)';

const CUBES = [
  { id: 'portfolio',     label: ['Portfolio'],          origin: { x: 119, y: 545 }, color: '#ffecce', textColor: 'rgb(246,201,131)', href: '/portfolio/' },
  { id: 'blog',          label: ['Blog'],               origin: { x: 507, y: 569 }, color: '#e4ffcf', textColor: 'rgb(133,208,74)',  href: '/blog/' },
  { id: 'documentation', label: ['Documentation'],      origin: { x: 618, y: 315 }, color: '#ffcfd1', textColor: 'rgb(242,160,163)', href: '/docs/' },
  { id: 'ask',           label: ['Ask me', 'everything'], origin: { x: 987, y: 295 }, color: '#cffffd', textColor: 'rgb(150,207,204)', href: '/about/' },
];

export default function IsometricScene() {
  return (
    <svg viewBox="0 0 1620 1080" className="w-full h-full">
      {/* Brand title */}
      <g transform="matrix(0.655052,-0.271331,0.580798,0.406679,387.857,989.093)">
        <text x="236.609" y="241.416" style={{ fontFamily: 'Helvetica', fontSize: '200px', fill: 'rgb(201,100,66)' }}>THE</text>
        <text x="688.609" y="241.416" style={{ fontFamily: 'Helvetica', fontSize: '200px', fill: 'rgb(201,100,66)' }}>OWN</text>
        <text x="1229.379" y="241.416" style={{ fontFamily: 'Helvetica', fontSize: '200px', fill: 'rgb(201,100,66)' }}>LAB</text>
      </g>

      {CUBES.map((cube, i) => {
        const paths = createCube(cube.origin);
        const slidePath = createSlidePath(cube.origin, 2);

        // Position text above cube's top-north point (P2)
        // P2 ≈ (origin.x + 180, origin.y - 75), then offset up by 30
        const labelX = cube.origin.x + 180;
        const labelY = cube.origin.y - 105;

        return (
          <a key={cube.id} href={cube.href}>
            <g className="cube" style={{ '--delay': `${-i * 1.5}s` } as React.CSSProperties}>
              <path d={slidePath} fill="none" />
              <path d={paths.shadow} fill="rgba(0,0,0,0.15)" />
              <path d={paths.side} fill="rgb(183,183,183)" />
              <path d={paths.front} fill="rgb(160,160,160)" />
              <path d={paths.top} fill={cube.color} />
              <g transform={`translate(${labelX},${labelY}) ${ISO_TEXT}`}>
                {cube.label.map((line, li) => (
                  <text
                    key={li}
                    x={0}
                    y={li * 26}
                    textAnchor="start"
                    fill={cube.textColor}
                    fontSize="26"
                    fontWeight="600"
                    fontFamily="Helvetica, sans-serif"
                  >
                    {line}
                  </text>
                ))}
              </g>
            </g>
          </a>
        );
      })}
    </svg>
  );
}
