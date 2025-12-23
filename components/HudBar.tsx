/**
 * HUD 바 컴포넌트
 * 상단에 스코어, 시간, 전술, 볼 소유 표시
 */
import React from 'react';
import { TeamInstruction } from './TeamInstruction';

interface HudBarProps {
  score: { A: number; B: number };
  currentStep: number;
  totalSteps: number;
  instruction: TeamInstruction;
  ballOwnerTeam: string | null;
}

export default function HudBar({
  score,
  currentStep,
  totalSteps,
  instruction,
  ballOwnerTeam,
}: HudBarProps) {
  const getInstructionSummary = (inst: TeamInstruction): string => {
    const attack = inst.attackStyle === 'aggressive' ? '공격' : inst.attackStyle === 'defensive' ? '안정' : '균형';
    const press = inst.pressingIntensity === 'high' ? '높음' : inst.pressingIntensity === 'low' ? '낮음' : '중간';
    return `${attack} / 압박${press}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderBottom: '2px solid #00ffff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 999,
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* 스코어 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#0066ff',
          }}
        >
          {score.A}
        </div>
        <div style={{ color: '#888', fontSize: '14px' }}>:</div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ff3333',
          }}
        >
          {score.B}
        </div>
      </div>

      {/* 시간/Step */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
          STEP
        </div>
        <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>
          {currentStep} / {totalSteps}
        </div>
      </div>

      {/* 전술 요약 배지 */}
      <div
        style={{
          backgroundColor: '#0f0f1e',
          border: '1px solid #00ffff',
          borderRadius: '12px',
          padding: '6px 12px',
          fontSize: '10px',
          color: '#00ffff',
          maxWidth: '120px',
          textAlign: 'center',
        }}
      >
        {getInstructionSummary(instruction)}
      </div>

      {/* 볼 소유 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: ballOwnerTeam === 'A' ? '#0066ff' : ballOwnerTeam === 'B' ? '#ff3333' : '#666',
            boxShadow: ballOwnerTeam ? '0 0 8px currentColor' : 'none',
          }}
        />
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          {ballOwnerTeam ? `팀 ${ballOwnerTeam}` : '없음'}
        </div>
      </div>
    </div>
  );
}
