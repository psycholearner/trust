import React, { useEffect, useRef } from 'react';

export const InteractiveBackground = () => {
  const spotlight1Ref = useRef<HTMLDivElement>(null);
  const spotlight2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Performance Optimization: 
    // Instead of updating CSS variables which trigger paint (for gradients),
    // we translate absolute positioned divs. 'transform' is compositor-only and much faster (60fps guaranteed).
    
    let requestRef: number;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    // Smooth trailing coordinates
    let currentX1 = mouseX;
    let currentY1 = mouseY;
    let currentX2 = mouseX;
    let currentY2 = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const animate = () => {
      if (spotlight1Ref.current && spotlight2Ref.current) {
        // Easing for Spotlight 1 (Primary)
        currentX1 += (mouseX - currentX1) * 0.1;
        currentY1 += (mouseY - currentY1) * 0.1;

        // Easing for Spotlight 2 (Secondary, slower)
        currentX2 += (mouseX - currentX2) * 0.05;
        currentY2 += (mouseY - currentY2) * 0.05;

        // Apply transforms centered on the mouse
        // Assuming spotlight 1 is 800px wide (radius 400)
        spotlight1Ref.current.style.transform = `translate3d(${currentX1 - 400}px, ${currentY1 - 400}px, 0)`;
        
        // Assuming spotlight 2 is 400px wide (radius 200)
        spotlight2Ref.current.style.transform = `translate3d(${currentX2 - 200}px, ${currentY2 - 200}px, 0)`;
      }
      requestRef = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    requestRef = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(requestRef);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base Grid Pattern (Static, no repaint) */}
      <div 
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Spotlight 1: Primary Glow (Moving Div) */}
      <div 
        ref={spotlight1Ref}
        className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full opacity-60 will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)',
          // Start off-screen or centered
          transform: 'translate3d(-50%, -50%, 0)' 
        }}
      />
      
      {/* Spotlight 2: Secondary Depth Glow (Moving Div) */}
      <div 
        ref={spotlight2Ref}
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full opacity-50 will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
          transform: 'translate3d(-50%, -50%, 0)'
        }}
      />
    </div>
  );
};