import { useRef, useState } from 'react';

export default function TiltedCard({
  children,
  className = '',
  containerClassName = '',
  rotateAmplitude = 12,
  scaleOnHover = 1.02,
  borderColor = 'border-brand-200',
  glowColor = 'shadow-brand-100',
}) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -rotateAmplitude;
    const rotateY = ((x - centerX) / centerX) * rotateAmplitude;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scaleOnHover})`);
  };

  const handleMouseLeave = () => {
    setTransform('');
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div className={`${containerClassName}`}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          transition-all duration-200 ease-out
          bg-white rounded-3xl border-2 ${borderColor}
          ${isHovered ? `shadow-2xl ${glowColor}` : 'shadow-xl'}
          ${className}
        `}
        style={{
          transform: transform || 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>
    </div>
  );
}
