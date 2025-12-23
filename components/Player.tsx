import React, { useEffect, useState } from 'react';

interface PlayerProps {
  team: string;
  position: string;
  playerId: number;
  zone: number[];
  cellSize: { width: number; height: number };
  hasBall?: boolean;
  isAnimating?: boolean;
  intent?: string;  // 디버그용
  showIntent?: boolean;  // intent 표시 여부
  isHighlighted?: boolean;  // 하이라이트 (패스 receiver 등)
  showLabel?: boolean;  // 감독모드: 역할 + intent 라벨 표시
  isPressing?: boolean;  // 감독모드: 압박 중 표시
}

// 포지션별 이동 속도 (ms)
const getMoveSpeed = (position: string): number => {
  if (position === 'GK') return 600; // 느림
  if (position === 'DF') return 500; // 느림
  if (position === 'CM') return 400; // 보통
  if (position === 'FW') return 300; // 빠름
  return 400;
};

// 포지션별 스타일
const getPositionStyle = (position: string, team: string) => {
  const teamColor = team === 'A' ? '#0066ff' : '#ff3333';

  if (position === 'GK') {
    return {
      bgColor: '#333',
      color: '#fff',
      shape: 'square' as const,
    };
  } else if (position === 'DF') {
    return {
      bgColor: '#0066cc',
      color: '#fff',
      shape: 'circle' as const,
    };
  } else if (position === 'CM') {
    return {
      bgColor: '#28a745',
      color: '#fff',
      shape: 'circle' as const,
    };
  } else { // FW
    return {
      bgColor: '#dc3545',
      color: '#fff',
      shape: 'circle' as const,
    };
  }
};

// Intent 표시 텍스트
const getIntentText = (intent?: string): string => {
  const intentMap: { [key: string]: string } = {
    hold_goal: 'HOLD',
    hold_line: 'LINE',
    slide: 'SLIDE',
    create_passing_angle: 'ANGLE',
    maintain_triangle: 'TRI',
    cover_opposite_space: 'COVER',
    make_forward_run: 'RUN',
    hold_up_play: 'HOLD',
    press_forward: 'PRESS',
    press: 'PRESS',
    tackle: 'TACKLE',
    idle: '',
  };
  return intentMap[intent || ''] || '';
};

export default function Player({
  team,
  position,
  playerId,
  zone,
  cellSize,
  hasBall = false,
  isAnimating = false,
  intent,
  showIntent = false,
  isHighlighted = false,
  showLabel = true,  // 감독모드 기본값
  isPressing = false,
}: PlayerProps) {
  const [displayZone, setDisplayZone] = useState(zone);
  const style = getPositionStyle(position, team);
  const isGK = position === 'GK';
  const isAtGoal = (team === 'A' && zone[0] === 0) || (team === 'B' && zone[0] === 5);

  // zone이 변경되면 애니메이션으로 이동
  useEffect(() => {
    if (JSON.stringify(displayZone) !== JSON.stringify(zone)) {
      setDisplayZone(zone);
    }
  }, [zone, displayZone]);

  // 절대 위치 계산
  const left = displayZone[0] * cellSize.width + cellSize.width / 2;
  const top = displayZone[1] * cellSize.height + cellSize.height / 2;
  const moveSpeed = getMoveSpeed(position);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translate(-50%, -50%)',
        width: style.shape === 'square' ? '28px' : '26px',
        height: style.shape === 'square' ? '28px' : '26px',
        borderRadius: style.shape === 'square' ? '4px' : '50%',
        backgroundColor: style.bgColor,
        color: style.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        border: isGK && isAtGoal
          ? `3px solid #ffd700`
          : isHighlighted
          ? `3px solid #00ff00`
          : isPressing
          ? `3px solid #ffaa00`
          : hasBall
          ? `3px solid #fff`
          : `2px solid ${team === 'A' ? '#0066ff' : '#ff3333'}`,
        boxShadow: isGK && isAtGoal
          ? '0 0 8px rgba(255, 215, 0, 0.8)'
          : isHighlighted
          ? '0 0 12px rgba(0, 255, 0, 0.8)'
          : isPressing
          ? '0 0 12px rgba(255, 170, 0, 0.8)'
          : hasBall
          ? '0 0 12px rgba(255, 255, 255, 0.8)'
          : '0 2px 4px rgba(0,0,0,0.3)',
        transition: `left ${moveSpeed}ms ease-out, top ${moveSpeed}ms ease-out, transform 0.2s ease, box-shadow 0.3s ease`,
        transform: `translate(-50%, -50%) ${hasBall ? 'scale(1.1)' : 'scale(1)'}`,
        zIndex: hasBall ? 5 : 3,
        cursor: 'pointer',
      }}
      title={isGK ? `팀 ${team} ${position} (골대 지키는 중)` : `팀 ${team} ${position}${intent ? ` [${getIntentText(intent)}]` : ''}`}
    >
      <div style={{ position: 'relative' }}>
        {isGK ? '🛡️' : position}

        {/* 감독모드: 역할 + intent 라벨 */}
        {showLabel && (
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '9px',
            color: '#fff',
            fontWeight: 'bold',
            textShadow: '0 0 4px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #00ffff',
          }}>
            {position} {intent && getIntentText(intent) ? `[${getIntentText(intent)}]` : ''}
          </div>
        )}

        {/* 압박 중 표시 */}
        {isPressing && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            border: '2px dashed #ffaa00',
            borderRadius: '50%',
            pointerEvents: 'none',
            animation: 'pulse 1s infinite',
          }} />
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
