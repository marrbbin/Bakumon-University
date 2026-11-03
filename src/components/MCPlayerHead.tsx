import React, { useState, useEffect } from 'react';

interface MCPlayerHeadProps {
  username?: string;
  size?: number;
  className?: string;
}

export const MCPlayerHead: React.FC<MCPlayerHeadProps> = ({
  username = 'Steve',
  size = 48,
  className = '',
}) => {
  const cleanUsername = (username || 'Steve').trim().replace(/[^a-zA-Z0-9_]/g, '') || 'Steve';
  const [attempt, setAttempt] = useState(0);

  // Reset attempt if username changes
  useEffect(() => {
    setAttempt(0);
  }, [username]);

  // URLs in fallback order
  const sources = [
    `https://mc-heads.net/avatar/${cleanUsername}/${size}`,
    `https://minotar.net/helm/${cleanUsername}/${size}.png`,
    `https://cravatar.eu/helmavatar/${cleanUsername}/${size}.png`,
    `https://mc-heads.net/avatar/Steve/${size}`,
  ];

  const currentSrc = sources[attempt] || sources[sources.length - 1];

  const handleError = () => {
    if (attempt < sources.length - 1) {
      setAttempt((prev) => prev + 1);
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden bg-slate-100 border-2 border-slate-900 shrink-0 select-none shadow-[2px_2px_0_0_#0f172a] ${className}`}
      style={{ width: size, height: size }}
      title={`Minecraft Skin: ${cleanUsername}`}
    >
      <img
        src={currentSrc}
        alt={`${cleanUsername}'s Minecraft Head`}
        onError={handleError}
        className="w-full h-full object-contain"
        style={{ imageRendering: 'pixelated' }}
        loading="lazy"
      />
    </div>
  );
};
