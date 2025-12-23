import React, { useEffect, useState } from 'react';

interface BallProps {
  zone: number[];
  cellSize: { width: number; height: number };
  isMoving?: boolean;
  moveType?: 'pass' | 'shoot';
  fromZone?: number[];
}

export default function Ball({
  zone,
  cellSize,
  isMoving = false,
  moveType = 'pass',
  fromZone,
}: BallProps) {
  const [displayZone, setDisplayZone] = useState(zone);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isMoving && JSON.stringify(displayZone) !== JSON.stringify(zone)) {
      setIsAnimating(true);
      const duration = moveType === 'shoot' ? 600 : 350;

      // 약간의 지연 후 위치 업데이트 (애니메이션 시작)
      requestAnimationFrame(() => {
        setDisplayZone(zone);
      });

      // 애니메이션 완료 후 상태 리셋
      setTimeout(() => {
        setIsAnimating(false);
      }, duration);
    } else if (!isMoving) {
      // 이동이 끝나면 즉시 위치 업데이트
      setDisplayZone(zone);
      setIsAnimating(false);
    }
  }, [zone, isMoving, moveType]);

  // 절대 위치 계산
  const left = displayZone[0] * cellSize.width + cellSize.width / 2;
  const top = displayZone[1] * cellSize.height + cellSize.height / 2;

  // 슛의 경우 약간의 곡선 효과를 위한 추가 계산
  const getShootOffset = () => {
    if (!isAnimating || moveType !== 'shoot' || !fromZone) return 0;
    const distance = Math.abs(zone[0] - fromZone[0]) + Math.abs(zone[1] - fromZone[1]);
    return distance * 5; // 곡선 높이
  };

  const duration = moveType === 'shoot' ? 600 : 350;
  const easing = moveType === 'shoot' ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'ease-out';

  return (
    <>
      {/* 공 */}
      <div
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          transform: `translate(-50%, -50%) translateY(${-getShootOffset()}px)`,
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          border: '3px solid #000',
          zIndex: 10,
          boxShadow: isAnimating
            ? '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 6px rgba(0,0,0,0.5)'
            : '0 2px 6px rgba(0,0,0,0.5)',
          transition: isAnimating
            ? `left ${duration}ms ${easing}, top ${duration}ms ${easing}, transform ${duration}ms ${easing}, box-shadow 0.3s ease`
            : 'transform 0.2s ease, box-shadow 0.3s ease',
          animation: isAnimating && moveType === 'shoot' ? 'ballTrail 0.6s ease-out' : 'none',
        }}
      />

      {/* 공 이동 잔상 효과 (슛만) */}
      {isAnimating && moveType === 'shoot' && fromZone && (
        <div
          style={{
            position: 'absolute',
            left: `${fromZone[0] * cellSize.width + cellSize.width / 2}px`,
            top: `${fromZone[1] * cellSize.height + cellSize.height / 2}px`,
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            zIndex: 9,
            animation: 'ballTrailFade 0.6s ease-out forwards',
          }}
        />
      )}

      <style jsx>{`
        @keyframes ballTrail {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0px) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) translateY(-15px) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0px) scale(1);
          }
        }

        @keyframes ballTrailFade {
          0% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
        }
      `}</style>
    </>
  );
}
