"use client"

import { useState, type ReactNode } from 'react';

const ZOOM_SCALE = 2.5;

export default function ZoomableImage({ children, className }: { children: ReactNode; className?: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('center');

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomed) {
      setZoomed(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
    setZoomed(true);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'} ${className ?? ''}`}
    >
      <div
        className={`relative transition-transform duration-200 ease-out ${className ?? ''}`}
        style={{ transform: zoomed ? `scale(${ZOOM_SCALE})` : 'scale(1)', transformOrigin: origin }}
      >
        {children}
      </div>
    </div>
  );
}
