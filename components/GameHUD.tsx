import React from 'react';

interface GameHUDProps {
  score: { A: number; B: number };
  usedAction: string;
  totalSteps: number;
  goalScorers?: Array<{ team: string; position: string }>;
}

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

export default function GameHUD({ score, usedAction, totalSteps, goalScorers = [] }: GameHUDProps) {
  return (
    <div style={{
      position: 'sticky',
      top: '20px',
      padding: '20px',
      backgroundColor: 'rgba(26, 26, 46, 0.95)',
      borderRadius: '12px',
      border: '2px solid #0070f3',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      color: '#fff',
      minWidth: '280px',
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '16px',
        color: '#ffd700',
        textAlign: 'center',
        borderBottom: '2px solid #0070f3',
        paddingBottom: '8px',
      }}>
        📊 경기 요약
      </div>

      {/* 스코어 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>스코어</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '32px',
          fontWeight: 'bold',
        }}>
          <span style={{ color: '#0066ff' }}>A</span>
          <span style={{ color: '#fff' }}>{score.A}</span>
          <span style={{ color: '#666', fontSize: '20px' }}>:</span>
          <span style={{ color: '#fff' }}>{score.B}</span>
          <span style={{ color: '#ff3333' }}>B</span>
        </div>
      </div>

      {/* 사용된 전술 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>사용된 전술</div>
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 112, 243, 0.2)',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#00d4ff',
          textAlign: 'center',
          fontFamily: 'monospace',
        }}>
          {getActionDisplayName(usedAction)}
        </div>
      </div>

      {/* 골 득점자 */}
      {goalScorers.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>골 득점</div>
          <div style={{ fontSize: '14px', color: '#ffd700' }}>
            {goalScorers.map((scorer, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                🎯 팀 {scorer.team} {scorer.position}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경기 진행 */}
      <div>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>경기 진행</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
        }}>
          <span style={{ color: '#ccc' }}>총 스텝:</span>
          <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>{totalSteps}</span>
        </div>
      </div>
    </div>
  );
}
