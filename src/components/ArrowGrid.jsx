import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

const ArrowItem = ({ item, mousePos, containerRef }) => {
  const arrowRef = useRef(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (arrowRef.current && containerRef.current) {
      const arrowRect = arrowRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Arrow center relative to container
      const arrowX = arrowRect.left - containerRect.left + arrowRect.width / 2;
      const arrowY = arrowRect.top - containerRect.top + arrowRect.height / 2;

      const dx = mousePos.x - arrowX;
      const dy = mousePos.y - arrowY;
      
      // Calculate angle
      const rad = Math.atan2(dy, dx);
      const deg = rad * (180 / Math.PI);
      
      setAngle(deg);
    }
  }, [mousePos, containerRef]);

  return (
    <div className="flex items-center justify-center">
       <div 
         ref={arrowRef}
         style={{ transform: `rotate(${angle}deg)` }}
         className="w-6 h-6 md:w-8 md:h-8 transition-transform duration-75 ease-out"
       >
         <ArrowRight className="w-full h-full text-stone-500/60" strokeWidth={1.5} />
       </div>
    </div>
  );
};

const ArrowGrid = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [gridItems, setGridItems] = useState([]);

  // Create grid items
  useEffect(() => {
    const items = [];
    const rows = 7;
    const cols = 7;
    for (let i = 0; i < rows * cols; i++) {
      items.push({ id: i, x: (i % cols), y: Math.floor(i / cols) });
    }
    setGridItems(items);
  }, []);

  // Update mouse position relative to container
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex items-center justify-end">
      <div className="grid grid-cols-7 gap-6 md:gap-10">
        {gridItems.map((item) => {
          return <ArrowItem key={item.id} item={item} mousePos={mousePos} containerRef={containerRef} />;
        })}
      </div>
    </div>
  );
};

export default ArrowGrid;
