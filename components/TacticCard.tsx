import React from 'react';

interface TacticCardProps {
  action: string;
  confidence?: number;
  reason: string;
}

// 행동 이름을 게임 스타일 대문자로 변환
const getActionDisplayName = (action: string): string => {
  const names: { [key: string]: string } = {
    central_run: 'CENTRAL RUN',
    side_run: 'SIDE RUN',
    drop_link: 'DROP LINK',
    hold_position: 'HOLD POSITION',
    press_defend: 'PRESS DEFEND',
    switch_play: 'SWITCH PLAY',
  };
  return names[action] || action.toUpperCase();
};

export default function TacticCard({ action, confidence, reason }: TacticCardProps) {
  const displayName = getActionDisplayName(action);
  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#1a1a2e',
      borderRadius: '16px',
      border: '3px solid #0070f3',
      boxShadow: '0 8px 24px rgba(0, 112, 243, 0.3)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 배경 효과 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(0, 112, 243, 0.1) 0%, rgba(0, 112, 243, 0.05) 100%)',
        pointerEvents: 'none',
      }} />

      {/* 제목 */}
      <div style={{
        fontSize: '14px',
        color: '#ffd700',
        marginBottom: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        🔥 현재 추천 전술
      </div>

      {/* 전술 이름 - 게임 스타일 */}
      <div style={{
        fontSize: '36px',
        fontWeight: 'bold',
        color: '#00d4ff',
        marginBottom: '20px',
        textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
        letterSpacing: '2px',
        fontFamily: 'monospace',
      }}>
        {displayName}
      </div>

      {/* 신뢰도 게이지 바 (HP 바 느낌) */}
      {confidence !== undefined && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '14px', color: '#ccc', fontWeight: 'bold' }}>신뢰도</span>
            <span style={{ fontSize: '18px', color: '#00d4ff', fontWeight: 'bold' }}>
              {confidencePercent}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '28px',
            backgroundColor: '#333',
            borderRadius: '14px',
            overflow: 'hidden',
            border: '2px solid #555',
            position: 'relative',
          }}>
            <div style={{
              width: `${confidencePercent}%`,
              height: '100%',
              background: confidencePercent > 70
                ? 'linear-gradient(90deg, #28a745 0%, #20c997 100%)'
                : confidencePercent > 50
                ? 'linear-gradient(90deg, #ffc107 0%, #ff9800 100%)'
                : 'linear-gradient(90deg, #dc3545 0%, #c82333 100%)',
              borderRadius: '12px',
              transition: 'width 0.5s ease',
              boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
            }}>
              {confidencePercent > 20 && (
                <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>
                  █
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 추천 이유 */}
      <div style={{
        padding: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        borderLeft: '4px solid #0070f3',
        fontSize: '14px',
        color: '#e0e0e0',
        lineHeight: '1.6',
      }}>
        <div style={{ color: '#999', marginBottom: '4px', fontSize: '12px' }}>전술 설명</div>
        {reason}
      </div>
    </div>
  );
}
