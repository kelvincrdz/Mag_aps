import React from 'react';

interface CassetteProps {
  isPlaying: boolean;
  progress: number; // 0 to 1
  title: string;
}

export const Cassette: React.FC<CassetteProps> = ({ isPlaying, progress, title }) => {
  // Calculate tape radius based on progress
  const maxRadius = 45;
  const minRadius = 18;
  
  // Ensure progress is clamped 0-1
  const safeProgress = Math.max(0, Math.min(1, progress));
  
  // User requested: Tape fills up on the left reel and empties on the right reel
  const leftRadius = minRadius + (maxRadius - minRadius) * safeProgress;
  const rightRadius = minRadius + (maxRadius - minRadius) * (1 - safeProgress);

  return (
    <div className="w-full max-w-2xl aspect-[3/2] mx-auto relative select-none">
      <svg
        viewBox="0 0 600 380"
        className="w-full h-full drop-shadow-2xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main Body */}
        <rect x="10" y="10" width="580" height="360" rx="30" fill="#2a2e32" stroke="#1a1a1a" strokeWidth="4" />
        <rect x="25" y="25" width="550" height="330" rx="20" fill="#1f2326" />
        
        {/* Screw Holes */}
        <circle cx="40" cy="40" r="6" fill="#0f1316" />
        <circle cx="560" cy="40" r="6" fill="#0f1316" />
        <circle cx="40" cy="340" r="6" fill="#0f1316" />
        <circle cx="560" cy="340" r="6" fill="#0f1316" />
        <circle cx="300" cy="350" r="6" fill="#0f1316" />

        {/* Sticker/Label Area */}
        <path d="M 40 50 H 560 V 300 H 40 V 50 Z" fill="#e2eef6" rx="10" />
        
        {/* Red Header Strip */}
        <rect x="40" y="50" width="520" height="60" fill="#ec1d25" />
        <text x="300" y="90" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="32" fill="white" letterSpacing="4">
          MAG PLAYER
        </text>

        {/* Title Area */}
        <text x="300" y="140" textAnchor="middle" fontFamily="serif" fontWeight="bold" fontSize="20" fill="#2a2e32" className="uppercase">
          {title || "NO TAPE INSERTED"}
        </text>
        <line x1="80" y1="150" x2="520" y2="150" stroke="#2a2e32" strokeWidth="2" strokeDasharray="5,5" />

        {/* Central Window Cutout */}
        <rect x="120" y="170" width="360" height="110" rx="10" fill="#2a2e32" stroke="#1a1a1a" strokeWidth="2" />
        
        {/* Tape Reels Visualization (Behind the window glass) */}
        <g clipPath="url(#windowClip)">
            <defs>
                <clipPath id="windowClip">
                     <rect x="125" y="175" width="350" height="100" rx="8" />
                </clipPath>
            </defs>
            
            {/* Background of inside */}
            <rect x="120" y="170" width="360" height="110" fill="#15181b" />

            {/* Connecting Tape Bridge */}
            {/* Using a trapezoid path that connects the tangents of the two reels */}
            <path 
              d={`M 200 ${225 + leftRadius} L 400 ${225 + rightRadius} L 400 ${225 - rightRadius} L 200 ${225 - leftRadius} Z`} 
              fill="#3d2b2b" 
              opacity="0.9" 
            />

            {/* Left Tape Spool */}
            <circle cx="200" cy="225" r={leftRadius} fill="#3d2b2b" className="transition-[r] duration-200 ease-linear" />
            
            {/* Right Tape Spool */}
            <circle cx="400" cy="225" r={rightRadius} fill="#3d2b2b" className="transition-[r] duration-200 ease-linear" />
        </g>

        {/* Reel Cogs (The spinning parts) */}
        {/* Left Cog */}
        <g transform="translate(200, 225)">
            <g className={isPlaying ? "animate-spin-reverse" : ""}>
                <circle r="18" fill="white" stroke="#ccc" strokeWidth="2" />
                <circle r="6" fill="#2a2e32" />
                {[0, 60, 120, 180, 240, 300].map(angle => (
                    <rect key={angle} x="-4" y="-22" width="8" height="10" fill="white" transform={`rotate(${angle})`} />
                ))}
            </g>
        </g>

        {/* Right Cog */}
        <g transform="translate(400, 225)">
            <g className={isPlaying ? "animate-spin-reverse" : ""}>
                <circle r="18" fill="white" stroke="#ccc" strokeWidth="2" />
                <circle r="6" fill="#2a2e32" />
                {[0, 60, 120, 180, 240, 300].map(angle => (
                    <rect key={angle} x="-4" y="-22" width="8" height="10" fill="white" transform={`rotate(${angle})`} />
                ))}
            </g>
        </g>

        {/* Glass Reflection */}
        <path d="M 130 280 L 160 180 L 200 180 L 170 280 Z" fill="white" opacity="0.05" />
        <path d="M 400 280 L 430 180 L 470 180 L 440 280 Z" fill="white" opacity="0.05" />

        {/* Bottom Decorative Black Strip */}
        <path d="M 40 300 H 560 V 330 H 40 Z" fill="#000" />
        <text x="60" y="320" fontFamily="monospace" fontSize="12" fill="#ec1d25">A</text>
        <text x="530" y="320" fontFamily="monospace" fontSize="12" fill="#ec1d25">NR</text>

      </svg>
      
      {/* Subtle Glow Overlay */}
      <div className="absolute inset-0 rounded-[30px] pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-white/5"></div>
    </div>
  );
};
