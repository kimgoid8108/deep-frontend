import React from 'react';

interface HeaderProps {
  backendStatus: 'checking' | 'online' | 'offline';
}

export default function Header({ backendStatus }: HeaderProps) {
  const statusConfig = {
    online: { bg: 'rgba(40, 167, 69, 0.2)', border: '#28a745', color: '#28a745', text: '● 백엔드 연결: 정상' },
    offline: { bg: 'rgba(220, 53, 69, 0.2)', border: '#dc3545', color: '#dc3545', text: '● 백엔드 연결: 오류' },
    checking: { bg: 'rgba(255, 193, 7, 0.2)', border: '#ffc107', color: '#ffc107', text: '● 백엔드 확인 중...' },
  };

  const config = statusConfig[backendStatus];

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderRadius: '12px',
        border: '2px solid #0070f3',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{
          margin: 0,
          color: '#fff',
          fontSize: '28px',
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(0, 112, 243, 0.5)',
        }}>
          ⚽ 축구 시뮬레이션 게임
        </h1>
        <div style={{
          padding: '10px 20px',
          borderRadius: '20px',
          backgroundColor: config.bg,
          border: `2px solid ${config.border}`,
          color: config.color,
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: config.color,
            boxShadow: backendStatus === 'online' ? `0 0 10px ${config.color}` : 'none',
            animation: backendStatus === 'online' ? 'pulse 2s infinite' : 'none',
          }} />
          {config.text}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `
      }} />
    </>
  );
}
