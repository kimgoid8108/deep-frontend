import React from 'react';

interface DebugInfoProps {
  simulationCount: number;
  lastApiCall: Date | null;
}

export default function DebugInfo({ simulationCount, lastApiCall }: DebugInfoProps) {
  return (
    <div style={{
      marginTop: '40px',
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#666',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>시스템 정보</div>
      <div>시뮬레이션 실행 횟수: {simulationCount}</div>
      {lastApiCall && (
        <div>마지막 API 호출: {lastApiCall.toLocaleTimeString()}</div>
      )}
    </div>
  );
}
