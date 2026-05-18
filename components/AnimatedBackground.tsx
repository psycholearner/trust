import React, { useEffect, useRef } from 'react';

export const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    
    // Configuration
    const fontSize = 14;
    const columns = Math.ceil(w / fontSize);
    const drops: number[] = new Array(columns).fill(1); // Y-coordinate of the drop
    
    // Binary/Hex characters
    const chars = "010101001010101SECURE010101ENCRYPT0101HASH0101BLOCKCHAIN01";
    
    // Grid Configuration
    const gridSpacing = 50;
    let scanLineY = 0;

    const drawMatrix = () => {
      // Fade effect trail
      ctx.fillStyle = 'rgba(15, 23, 42, 0.05)'; // Dark Slate 900 with very low opacity for trail
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        // Randomize color slightly for depth
        const isHighlight = Math.random() > 0.98;
        ctx.fillStyle = isHighlight ? '#38bdf8' : '#0c4a6e'; // Bright Sky vs Dark Sky

        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        // Reset drop to top randomly after it crosses screen
        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Increment Y
        drops[i]++;
      }
    };

    const drawGrid = () => {
      // Overlay a subtle tech grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)'; // Very faint sky blue
      ctx.lineWidth = 1;

      for (let x = 0; x <= w; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = 0; y <= h; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    const drawScanLine = () => {
      // Cyber scan line
      scanLineY += 2;
      if (scanLineY > h) scanLineY = 0;

      const gradient = ctx.createLinearGradient(0, scanLineY, 0, scanLineY + 100);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0)');
      gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.1)'); // Faint glow
      gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanLineY, w, 100);
    };

    const animate = () => {
      if (!ctx) return;
      
      // We don't clearRect completely because we want the matrix trail effect
      // But we need to be careful not to overdraw the grid
      
      drawMatrix();
      // Grid and Scanline need to be drawn on top
      drawGrid();
      drawScanLine();

      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      // Re-initialize drops
      const newCols = Math.ceil(w / fontSize);
      // Preserve existing drops if possible, extend if wider
      if (newCols > drops.length) {
         const added = new Array(newCols - drops.length).fill(1);
         drops.push(...added);
      }
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ background: '#0f172a' }} // Ensure base background is dark immediately
    />
  );
};