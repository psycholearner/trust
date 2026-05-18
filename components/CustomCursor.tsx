import React, { useEffect, useRef, useState } from 'react';

export const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  
  // Use refs for state accessed in animation loop to avoid dependency staleness
  const hoverStateRef = useRef<'default' | 'pointer' | 'text'>('default');
  const [hoverState, setHoverState] = useState<'default' | 'pointer' | 'text'>('default');
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    // Only run on desktop
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const cursor = cursorRef.current;
    const follower = followerRef.current;
    
    // Physics State
    let mouseX = -100;
    let mouseY = -100;
    let cursorX = -100;
    let cursorY = -100;
    let followerX = -100;
    let followerY = -100;
    
    // Velocity tracking for jelly effect
    let velX = 0;
    let velY = 0;
    let rotate = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseDown = () => setClicking(true);
    const onMouseUp = () => setClicking(false);

    // PERFORMANCE OPTIMIZATION: Removed window.getComputedStyle(target)
    // Checking computed styles triggers a synchronous layout/reflow which kills performance.
    // Instead, we rely on efficient tag checking and class name inspection.
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      let newState: 'default' | 'pointer' | 'text' = 'default';
      const tagName = target.tagName;

      // Efficient Pointer Detection
      if (
        tagName === 'A' || 
        tagName === 'BUTTON' || 
        tagName === 'LABEL' ||
        tagName === 'SELECT' ||
        target.closest('a') || 
        target.closest('button') ||
        target.classList.contains('cursor-pointer') ||
        target.classList.contains('hover:cursor-pointer')
      ) {
        newState = 'pointer';
      } 
      // Efficient Text Detection
      else if (
        tagName === 'INPUT' || 
        tagName === 'TEXTAREA' || 
        tagName === 'P' || 
        tagName === 'SPAN' ||
        tagName === 'H1' || tagName === 'H2' || tagName === 'H3' || 
        tagName === 'H4' || tagName === 'H5' || tagName === 'H6' ||
        tagName === 'LI' ||
        target.classList.contains('cursor-text')
      ) {
        newState = 'text';
      }

      // Only update state if it changed to reduce React renders
      if (hoverStateRef.current !== newState) {
        hoverStateRef.current = newState;
        setHoverState(newState);
      }
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseover', onMouseOver, { passive: true });

    // Animation loop
    let animationFrameId: number;
    const loop = () => {
      // 1. Main Cursor Dot (Instant)
      // Linear interpolation with high factor for responsiveness
      cursorX += (mouseX - cursorX) * 0.9;
      cursorY += (mouseY - cursorY) * 0.9;

      // 2. Follower Ring (Fluid Physics)
      // Smoother interpolation
      const ease = 0.15; // Slightly increased for snappier feel
      const prevFollowerX = followerX;
      const prevFollowerY = followerY;
      
      followerX += (mouseX - followerX) * ease;
      followerY += (mouseY - followerY) * ease;

      // 3. Velocity Calculation
      velX = followerX - prevFollowerX;
      velY = followerY - prevFollowerY;
      const speed = Math.sqrt(velX * velX + velY * velY);
      
      // 4. Squeeze & Stretch Logic (Jelly Effect)
      const currentHoverState = hoverStateRef.current;
      
      if (cursor && follower) {
        // Update Main Dot
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
        
        // Update Follower
        if (currentHoverState === 'text') {
           // Text Mode: No rotation, vertical bar shape handled by CSS classes
           follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
        } else {
           // Shape Mode: Apply rotation and scale
           const stretch = Math.min(speed * 0.04, 0.5); // Cap stretch
           const scaleX = 1 + stretch;
           const scaleY = 1 - (stretch * 0.4); 
           
           // Only update rotation if moving significantly to prevent jitter
           if (speed > 0.5) {
              rotate = Math.atan2(velY, velX);
           }
           
           follower.style.transform = `
             translate3d(${followerX}px, ${followerY}px, 0) 
             translate(-50%, -50%) 
             rotate(${rotate}rad) 
             scale(${scaleX}, ${scaleY})
           `;
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseover', onMouseOver);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Determine styles based on state
  const baseClasses = "fixed top-0 left-0 pointer-events-none z-[9998] hidden md:block transition-[width,height,background-color,border-color,border-radius] duration-300 ease-out will-change-transform backface-visibility-hidden";
  
  let dynamicClasses = "";
  if (hoverState === 'pointer') {
    dynamicClasses = "w-12 h-12 bg-brand-500/10 border border-brand-500/30 backdrop-blur-[1px] rounded-full";
  } else if (hoverState === 'text') {
    dynamicClasses = "w-1 h-6 bg-slate-800 rounded-none border-none"; // Vertical Bar
  } else if (clicking) {
    dynamicClasses = "w-4 h-4 bg-slate-200/50 border border-slate-600 rounded-full";
  } else {
    dynamicClasses = "w-6 h-6 bg-transparent border border-slate-400/50 rounded-full";
  }

  return (
    <>
      {/* Center Dot (Hidden in text mode for cleaner look) */}
      <div 
        ref={cursorRef} 
        className={`fixed top-0 left-0 w-2 h-2 bg-slate-900 rounded-full pointer-events-none z-[9999] hidden md:block mix-blend-multiply transition-opacity duration-200 will-change-transform backface-visibility-hidden ${hoverState === 'text' ? 'opacity-0' : 'opacity-100'}`}
      />
      
      {/* Fluid Follower */}
      <div 
        ref={followerRef} 
        className={`${baseClasses} ${dynamicClasses}`}
      />
    </>
  );
};