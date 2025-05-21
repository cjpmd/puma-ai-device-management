
import React from 'react';
import { DetectedPlayer } from './hooks/useAugmentedReality';

interface PlayerOverlayProps {
  player: DetectedPlayer;
  canvasWidth: number;
  canvasHeight: number;
  mode: 'basic' | 'detailed' | 'biometrics';
}

const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  player,
  canvasWidth,
  canvasHeight,
  mode
}) => {
  const [x, y, width, height] = player.bbox;
  
  // Calculate position styles
  const styles = {
    position: 'absolute',
    left: `${(x / canvasWidth) * 100}%`,
    top: `${(y / canvasHeight) * 100}%`,
    width: `${(width / canvasWidth) * 100}%`,
    height: `${(height / canvasHeight) * 100}%`,
  } as React.CSSProperties;
  
  // Determine border color based on confidence
  const getBorderColor = () => {
    if (player.confidence > 0.8) return 'border-green-500';
    if (player.confidence > 0.6) return 'border-yellow-500';
    return 'border-red-500';
  };
  
  // Get heart rate color based on value
  const getHeartRateColor = () => {
    const rate = player.biometrics?.heartRate;
    if (!rate) return 'text-gray-400';
    if (rate > 175) return 'text-red-500';
    if (rate > 160) return 'text-orange-500';
    if (rate > 140) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  return (
    <div 
      style={styles}
      className={`border-2 ${getBorderColor()} rounded-md flex flex-col justify-between`}
    >
      {/* Top label - Make squad number more prominent */}
      <div className="bg-black/70 text-white px-1 py-0.5 rounded-tl rounded-br self-start">
        <span className="font-bold text-sm">#{player.shirtNumber}</span>
      </div>
      
      {/* Bottom data panel */}
      {mode !== 'basic' && (
        <div className="bg-black/70 text-white text-xs p-1 rounded-bl rounded-tr self-end mt-auto">
          {mode === 'detailed' && (
            <div className="flex flex-col">
              <span className="font-medium">{player.name || `Player ${player.id + 1}`}</span>
              <span>{player.position || 'Unknown'}</span>
            </div>
          )}
          
          {mode === 'biometrics' && player.biometrics && (
            <div className="flex flex-col">
              <span className={`${getHeartRateColor()}`}>
                {player.biometrics.heartRate || '---'} bpm
              </span>
              <span className="text-blue-300">
                {player.biometrics.speed || '---'} m/s
              </span>
              <span className="text-green-300">
                {player.biometrics.distance || '---'} km
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerOverlay;
