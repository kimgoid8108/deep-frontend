import React, { useRef, useEffect, useState } from 'react';
import Player from './Player';
import Ball from './Ball';

interface Player {
  team: string;
  position: string;
  playerId: number;
  zone: number[];
  intent?: string;  // 디버그용
}

interface AnimatedGameFieldProps {
  players: Player[];
  ballZone: number[];
  ballOwner?: { team: string; playerId: number } | null;
  currentEvent?: {
    type: string;
    fromZone: number[];
    toZone: number[];
  } | null;
  passInfo?: {
    fromZone: number[];
    toZone: number[];
    receiverId: { team: string; playerId: number } | null;
    success: boolean;
  } | null;
  fieldWidth?: number;
  fieldHeight?: number;
  showPlayerLabels?: boolean;  // 감독모드: 선수 라벨 표시
  showPassPath?: boolean;  // 감독모드: 패스 경로 표시
  pressingPlayers?: Array<{ team: string; playerId: number }>;  // 압박 중인 선수들
}

const FIELD_WIDTH = 6;
const FIELD_HEIGHT = 4;

export default function AnimatedGameField({
  players,
  ballZone,
  ballOwner = null,
  currentEvent = null,
  passInfo = null,
  fieldWidth = FIELD_WIDTH,
  fieldHeight = FIELD_HEIGHT,
  showPlayerLabels = true,
  showPassPath = true,
  pressingPlayers = [],
}: AnimatedGameFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState({ width: 0, height: 0 });

  // 셀 크기 계산
  useEffect(() => {
    const updateCellSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const gridContainer = container.querySelector('.grid-container') as HTMLElement;
        if (gridContainer) {
          const width = gridContainer.offsetWidth / fieldWidth;
          const height = gridContainer.offsetHeight / fieldHeight;
          setCellSize({ width, height });
        }
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, [fieldWidth, fieldHeight]);

  // 공 소유자 찾기
  const getBallOwnerPlayer = () => {
    if (!ballOwner) return null;
    return players.find(
      (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
    );
  };

  const ballOwnerPlayer = getBallOwnerPlayer();
  const effectiveBallZone = ballOwnerPlayer ? ballOwnerPlayer.zone : ballZone;

  // 공 이동 타입 및 상태 결정
  const ballMoveType = currentEvent?.type === 'shoot' ? 'shoot' : 'pass';
  const ballIsMoving = currentEvent !== null && (
    currentEvent.type === 'pass' || currentEvent.type === 'shoot'
  );

  // 공의 실제 위치 (이동 중이면 fromZone, 아니면 zone)
  const actualBallZone = ballIsMoving && currentEvent?.fromZone
    ? currentEvent.fromZone
    : effectiveBallZone;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#2d5016',
        borderRadius: '12px',
        padding: '12px',
        border: '3px solid #1a3a0a',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* 골대 표시 */}
      <div
        style={{
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
        }}
      />
      <div
        style={{
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
        }}
      />

      {/* 필드 그리드 (배경) */}
      <div
        className="grid-container"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${fieldWidth}, 1fr)`,
          gridTemplateRows: `repeat(${fieldHeight}, 1fr)`,
          gap: '3px',
          aspectRatio: `${fieldWidth}/${fieldHeight}`,
          position: 'relative',
        }}
      >
        {Array.from({ length: fieldHeight }).map((_, y) =>
          Array.from({ length: fieldWidth }).map((_, x) => (
            <div
              key={`${x},${y}`}
              style={{
                backgroundColor: '#4a7c2a',
                border: '1px solid #3a6a1a',
                minHeight: '50px',
              }}
            />
          ))
        )}
      </div>

      {/* 패스 경로 표시 (감독모드) */}
      {passInfo && showPassPath && cellSize.width > 0 && cellSize.height > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: 'calc(100% - 24px)',
            height: 'calc(100% - 24px)',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          <line
            x1={passInfo.fromZone[0] * cellSize.width + cellSize.width / 2}
            y1={passInfo.fromZone[1] * cellSize.height + cellSize.height / 2}
            x2={passInfo.toZone[0] * cellSize.width + cellSize.width / 2}
            y2={passInfo.toZone[1] * cellSize.height + cellSize.height / 2}
            stroke={passInfo.success ? '#00ff00' : '#ff0000'}
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        </svg>
      )}

      {/* 선수들 (absolute positioning) */}
      {cellSize.width > 0 && cellSize.height > 0 && (
        <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', bottom: '12px' }}>
          {players.map((player) => {
            const hasBall =
              ballOwnerPlayer &&
              ballOwnerPlayer.team === player.team &&
              ballOwnerPlayer.playerId === player.playerId &&
              !ballIsMoving;

            // 패스 receiver 하이라이트
            const isReceiver = passInfo?.receiverId &&
              passInfo.receiverId.team === player.team &&
              passInfo.receiverId.playerId === player.playerId;

            // 압박 중인 선수 확인
            const isPressing = pressingPlayers.some(
              (p) => p.team === player.team && p.playerId === player.playerId
            );

            return (
              <Player
                key={`${player.team}-${player.playerId}`}
                team={player.team}
                position={player.position}
                playerId={player.playerId}
                zone={player.zone}
                cellSize={cellSize}
                hasBall={hasBall}
                intent={player.intent}
                showIntent={false}
                showLabel={showPlayerLabels}  // 감독모드 라벨
                isHighlighted={isReceiver}
                isPressing={isPressing}
              />
            );
          })}

          {/* 공 소유자 링 표시 (감독모드) */}
          {ballOwnerPlayer && !ballIsMoving && cellSize.width > 0 && cellSize.height > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${ballOwnerPlayer.zone[0] * cellSize.width + cellSize.width / 2}px`,
                top: `${ballOwnerPlayer.zone[1] * cellSize.height + cellSize.height / 2}px`,
                transform: 'translate(-50%, -50%)',
                width: '50px',
                height: '50px',
                border: '3px solid #fff',
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 6,
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)',
                animation: 'ringPulse 2s ease-in-out infinite',
              }}
            />
          )}

          {/* 공 */}
          {cellSize.width > 0 && cellSize.height > 0 && (
            <Ball
              zone={ballIsMoving ? currentEvent?.toZone || effectiveBallZone : effectiveBallZone}
              cellSize={cellSize}
              isMoving={ballIsMoving}
              moveType={ballMoveType}
              fromZone={ballIsMoving ? currentEvent?.fromZone : undefined}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes ringPulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>

      {/* 포지션 범례 */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '11px',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#333',
              borderRadius: '4px',
              border: '1px solid #fff',
            }}
          />
          <span>GK</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#0066cc',
              borderRadius: '50%',
              border: '1px solid #fff',
            }}
          />
          <span>DF</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#28a745',
              borderRadius: '50%',
              border: '1px solid #fff',
            }}
          />
          <span>CM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#dc3545',
              borderRadius: '50%',
              border: '1px solid #fff',
            }}
          />
          <span>FW</span>
        </div>
      </div>
    </div>
  );
}
