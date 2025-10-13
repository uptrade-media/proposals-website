import { useEffect, useRef } from 'react';

export default function HyperspaceBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    const stars = [];
    const numStars = 40;
    
    const colors = [
      '#6677ff',
      '#7788ff',
      '#8899ff',
      '#99aaff',
      '#aabbff',
      '#bbccff',
      '#ffffff'
    ];
    
    class Star {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.angle = Math.random() * Math.PI * 2;
        this.distance = Math.random() * 200 + 100;
        this.speed = Math.random() * 10 + 8;
        this.prevX = centerX + Math.cos(this.angle) * this.distance;
        this.prevY = centerY + Math.sin(this.angle) * this.distance;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.5 + 0.5;
      }
      
      update() {
        this.distance += this.speed;
        
        const x = centerX + Math.cos(this.angle) * this.distance;
        const y = centerY + Math.sin(this.angle) * this.distance;
        
        const fadeDistance = 1500;
        const distanceOpacity = Math.min(this.distance / fadeDistance, 1);
        
        ctx.beginPath();
        ctx.moveTo(this.prevX, this.prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = this.opacity * distanceOpacity;
        ctx.lineWidth = 7.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        this.prevX = x;
        this.prevY = y;
        
        const maxDistance = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        if (this.distance > maxDistance) {
          this.reset();
        }
      }
    }
    
    for (let i = 0; i < numStars; i++) {
      const star = new Star();
      star.distance = Math.random() * Math.max(canvas.width, canvas.height);
      stars.push(star);
    }
    
    let animationId;
    function animate() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach(star => star.update());
      
      animationId = requestAnimationFrame(animate);
    }
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      centerX = canvas.width / 2;
      centerY = canvas.height / 2;
      stars.forEach(star => star.reset());
    };
    
    window.addEventListener('resize', handleResize);
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        zIndex: 0
      }}
    />
  );
}