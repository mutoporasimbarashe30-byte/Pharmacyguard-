import React from 'react';

interface BarcodeVisualProps {
  code: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Deterministically generates vertical barcode lines based on any barcode string.
 * Renders an authentic EAN/UPC-style SVG barcode with guard bars and varying bar thicknesses.
 */
export const BarcodeVisual: React.FC<BarcodeVisualProps> = ({
  code,
  width = 160,
  height = 48,
  showText = true,
  className = '',
  compact = false,
}) => {
  const safeCode = (code || '0000000000000').replace(/[^0-9A-Z]/gi, '');

  // Generate deterministic bar widths based on code characters
  const bars: { width: number; isBlack: boolean }[] = [];

  // Start guard pattern (thin black, thin white, thin black)
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  // Body bars derived from string digits
  for (let i = 0; i < safeCode.length; i++) {
    const charCode = safeCode.charCodeAt(i);
    // 3 pairs of bar/space per character
    const w1 = ((charCode * 3 + i) % 3) + 1;
    const w2 = ((charCode * 7 + i * 2) % 3) + 1;
    const w3 = ((charCode * 5 + i * 3) % 2) + 1;
    const w4 = ((charCode * 2 + i * 5) % 3) + 1;

    bars.push({ width: w1 * 1.5, isBlack: false });
    bars.push({ width: w2 * 1.5, isBlack: true });
    bars.push({ width: w3 * 1.5, isBlack: false });
    bars.push({ width: w4 * 1.5, isBlack: true });
  }

  // End guard pattern
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);
  const barHeight = compact ? height : height - (showText ? 16 : 0);

  let currentX = 0;

  return (
    <div className={`inline-flex flex-col items-center select-none font-mono ${className}`}>
      <svg
        viewBox={`0 0 ${totalUnits} ${barHeight}`}
        className="w-full h-auto max-h-full block"
        style={{ width: `${width}px`, height: `${barHeight}px` }}
        preserveAspectRatio="none"
      >
        <rect width={totalUnits} height={barHeight} fill="white" />
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (!bar.isBlack) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={barHeight}
              fill="#0f172a"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
          {safeCode}
        </span>
      )}
    </div>
  );
};
