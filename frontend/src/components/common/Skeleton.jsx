import React from 'react';

const Skeleton = ({ className = '', count = 1 }) => {
  return (
    <div className="space-y-3.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg bg-slate-200/80 ${className || 'h-4 w-full'}`}
        />
      ))}
    </div>
  );
};

export default Skeleton;
