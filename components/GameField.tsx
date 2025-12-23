import React from 'react';

interface Player {
  team: string;
  position: string; // GK, DF, CM, FW
  playerId: number;
  zone: number[];
}

interface GameFieldProps {
  players: Player[];
  ballZone: number[];
  fieldWidth?: number;
  fieldHeight?: number;
}

const FIELD_WIDTH = 6;
const FIELD_HEIGHT = 5;

// 포지션별 색상 및 아이콘
const getPositionStyle = (position: string, team: string) => {
  const teamColor = team === 'A' ? '#0066ff' : '#ff3333';

  if (position === 'GK') {
    return {
      bgColor: '#333',
      color: '#fff',
      icon: '🛡️',
      shape: 'square' as const,
    };
  } else if (position === 'DF') {
    return {
      bgColor: '#0066cc',
      color: '#fff',
      icon: '🔵',
      shape: 'circle' as const,
    };
  } else if (position === 'CM') {
    return {
      bgColor: '#28a745',
      color: '#fff',
      icon: '🟢',
      shape: 'circle' as const,
    };
  } else { // FW
    return {
      bgColor: '#dc3545',
      color: '#fff',
      icon: '🔴',
      shape: 'circle' as const,
    };
  }
};

export default function GameField({ players, ballZone, fieldWidth = FIELD_WIDTH, fieldHeight = FIELD_HEIGHT }: GameFieldProps) {
  // 각 셀에 있는 선수들
  const cellPlayers: { [key: string]: Player[] } = {};

  players.forEach((player) => {
    const key = `${player.zone[0]},${player.zone[1]}`;
    if (!cellPlayers[key]) {
      cellPlayers[key] = [];
    }
    cellPlayers[key].push(player);
  });

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      backgroundColor: '#2d5016',
      borderRadius: '12px',
      padding: '12px',
      border: '3px solid #1a3a0a',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      {/* 골대 표시 */}
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '4px',
        height: '60%',
        backgroundColor: '#fff',
        border: '2px solid #000',
        borderRadius: '2px',
        zIndex: 1,
      }} />
      <div style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '4px',
        height: '60%',
        backgroundColor: '#fff',
        border: '2px solid #000',
        borderRadius: '2px',
        zIndex: 1,
      }} />

      {/* 필드 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${fieldWidth}, 1fr)`,
        gridTemplateRows: `repeat(${fieldHeight}, 1fr)`,
        gap: '3px',
        aspectRatio: `${fieldWidth}/${fieldHeight}`,
      }}>
        {Array.from({ length: fieldHeight }).map((_, y) =>
          Array.from({ length: fieldWidth }).map((_, x) => {
            const key = `${x},${y}`;
            const playersHere = cellPlayers[key] || [];
            const hasBall = ballZone[0] === x && ballZone[1] === y;

            return (
              <div
                key={key}
                style={{
                  backgroundColor: '#4a7c2a',
                  border: '1px solid #3a6a1a',
                  position: 'relative',
                  minHeight: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '2px',
                  padding: '4px',
                }}
              >
                {/* 선수 표시 */}
                {playersHere.map((player) => {
                  const style = getPositionStyle(player.position, player.team);
                  const isGK = player.position === 'GK';
                  // GK는 골대 근처에 있는지 확인 (팀 A: x=0, 팀 B: x=5)
                  const isAtGoal = (player.team === 'A' && player.zone[0] === 0) ||
                                  (player.team === 'B' && player.zone[0] === 5);

                  return (
                    <div
                      key={`${player.team}-${player.playerId}`}
                      style={{
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
                          ? `3px solid #ffd700` // 골대 근처에 있으면 금색 테두리
                          : `2px solid ${player.team === 'A' ? '#0066ff' : '#ff3333'}`,
                        boxShadow: isGK && isAtGoal
                          ? '0 0 8px rgba(255, 215, 0, 0.8)' // 골대 지키는 효과
                          : '0 2px 4px rgba(0,0,0,0.3)',
                        position: 'relative',
                        zIndex: 2,
                      }}
                      title={isGK ? `팀 ${player.team} ${player.position} (골대 지키는 중)` : `팀 ${player.team} ${player.position}`}
                    >
                      {isGK ? '🛡️' : player.position}
                    </div>
                  );
                })}

                {/* 공 표시 */}
                {hasBall && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '3px solid #000',
                      zIndex: 10,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 포지션 범례 */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '11px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#333', borderRadius: '4px', border: '1px solid #fff' }} />
          <span>GK</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#0066cc', borderRadius: '50%', border: '1px solid #fff' }} />
          <span>DF</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#28a745', borderRadius: '50%', border: '1px solid #fff' }} />
          <span>CM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#dc3545', borderRadius: '50%', border: '1px solid #fff' }} />
          <span>FW</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
