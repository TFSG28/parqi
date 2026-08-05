'use client';
import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'right' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const offset = 15;

    if (position === 'left') {
      setTooltipPosition({
        x: e.clientX - offset,
        y: e.clientY - 10
      });
    } else {
      setTooltipPosition({
        x: e.clientX + offset,
        y: e.clientY - 10
      });
    }
  };

  const arrowClasses = position === 'left'
    ? "absolute -right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-gray-800"
    : "absolute -left-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-800";

  const tooltipClasses = position === 'left'
    ? "fixed z-50 px-3 py-2 bg-gray-800 text-white text-sm rounded-md shadow-lg transform -translate-y-1/2 -translate-x-full"
    : "fixed z-50 px-3 py-2 bg-gray-800 text-white text-sm rounded-md shadow-lg transform -translate-y-1/2";

  return (
    <div
      className="relative flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {isVisible && (
        <div
          className={tooltipClasses}
          style={{
            top: `${tooltipPosition.y}px`,
            left: `${tooltipPosition.x}px`,
            pointerEvents: 'none',
          }}
        >
          <div className={arrowClasses}></div>
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
