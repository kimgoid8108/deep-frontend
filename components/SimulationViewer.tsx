import { useState, useEffect } from 'react';

interface Event {
  t: number;
  type: string;
  team: string;
  player_id: number;
  from_zone: number[];
  to_zone: number[];
  result: string | null;
}

interface SimulationViewerProps {
  events: Event[];
}

const FIELD_WIDTH = 6;
const FIELD_HEIGHT = 4;

export default function SimulationViewer({ events }: SimulationViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms

  // 현재 step까지의 이벤트로 상태 재구성
  const currentEvents = events.slice(0, currentStep + 1);

  // 선수 위치 추적
  const playerPositions: { [key: string]: number[] } = {};

  // 초기 위치 설정
  const initialPositions: { [key: string]: number[] } = {
    'A-0': [4, 2], // FW
    'A-1': [3, 1], // MF
    'A-2': [2, 2], // DF
    'B-0': [1, 2],
    'B-1': [2, 1],
    'B-2': [1, 1],
  };

  // 이벤트를 순회하며 위치 업데이트
  currentEvents.forEach((event) => {
    const key = `${event.team}-${event.player_id}`;
    if (!playerPositions[key]) {
      playerPositions[key] = initialPositions[key] || [0, 0];
    }

    if (event.type === 'move' || event.type === 'pass') {
      playerPositions[key] = event.to_zone;
    }
  });

  // 초기화되지 않은 선수는 초기 위치 사용
  Object.keys(initialPositions).forEach((key) => {
    if (!playerPositions[key]) {
      playerPositions[key] = initialPositions[key];
    }
  });

  // 공 위치 (마지막 이벤트의 to_zone)
  const ballZone = currentEvents.length > 0
    ? currentEvents[currentEvents.length - 1].to_zone
    : [3, 2];

  // 골 이벤트 확인
  const goalEvents = currentEvents.filter((e) => e.type === 'shoot' && e.result === 'goal');

  // 자동 재생
  useEffect(() => {
    if (isPlaying && currentStep < events.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => Math.min(prev + 1, events.length - 1));
      }, speed);
      return () => clearTimeout(timer);
    } else if (currentStep >= events.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, events.length, speed]);

  const handlePlay = () => {
    if (currentStep >= events.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleStepForward = () => {
    if (currentStep < events.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* 컨트롤 */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={handleReset} style={{ padding: '5px 10px' }}>처음</button>
        <button onClick={handleStepBackward} disabled={currentStep === 0} style={{ padding: '5px 10px' }}>
          이전
        </button>
        {isPlaying ? (
          <button onClick={handlePause} style={{ padding: '5px 10px' }}>일시정지</button>
        ) : (
          <button onClick={handlePlay} style={{ padding: '5px 10px' }}>재생</button>
        )}
        <button onClick={handleStepForward} disabled={currentStep >= events.length - 1} style={{ padding: '5px 10px' }}>
          다음
        </button>
        <span>속도:</span>
        <input
          type="range"
          min="100"
          max="2000"
          step="100"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value))}
        />
        <span>{speed}ms</span>
        <span style={{ marginLeft: '20px' }}>
          Step: {currentStep + 1} / {events.length}
        </span>
      </div>

      {/* 골 알림 */}
      {goalEvents.length > 0 && (
        <div style={{
          padding: '10px',
          backgroundColor: '#ffd700',
          color: '#000',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '10px',
          borderRadius: '5px',
        }}>
          🎉 GOAL! (팀 {goalEvents[goalEvents.length - 1].team}) 🎉
        </div>
      )}

      {/* 필드 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${FIELD_WIDTH}, 1fr)`,
        gridTemplateRows: `repeat(${FIELD_HEIGHT}, 1fr)`,
        gap: '2px',
        backgroundColor: '#2d5016',
        padding: '10px',
        borderRadius: '8px',
        width: '100%',
        aspectRatio: `${FIELD_WIDTH}/${FIELD_HEIGHT}`,
      }}>
        {Array.from({ length: FIELD_HEIGHT }).map((_, y) =>
          Array.from({ length: FIELD_WIDTH }).map((_, x) => {
            const zoneKey = `${x},${y}`;
            const playersHere: string[] = [];

            Object.keys(playerPositions).forEach((key) => {
              const pos = playerPositions[key];
              if (pos[0] === x && pos[1] === y) {
                playersHere.push(key);
              }
            });

            const hasBall = ballZone[0] === x && ballZone[1] === y;

            return (
              <div
                key={zoneKey}
                style={{
                  backgroundColor: '#4a7c2a',
                  border: '1px solid #3a6a1a',
                  position: 'relative',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* 선수 표시 */}
                {playersHere.map((key) => {
                  const [team, id] = key.split('-');
                  const role = ['FW', 'MF', 'DF'][parseInt(id)];
                  return (
                    <div
                      key={key}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor: team === 'A' ? '#0066ff' : '#ff3333',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        margin: '2px',
                        border: '2px solid white',
                      }}
                      title={`팀 ${team} ${role}`}
                    >
                      {role}
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
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      border: '2px solid #000',
                      zIndex: 10,
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 이벤트 로그 */}
      <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
        <h3>이벤트 로그</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Step</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>타입</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>팀</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>선수</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>위치</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>결과</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx <= currentStep ? '#fff' : '#f9f9f9',
                  opacity: idx <= currentStep ? 1 : 0.5,
                }}
              >
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{event.t}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{event.type}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>팀 {event.team}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {['FW', 'MF', 'DF'][event.player_id]}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  [{event.from_zone[0]}, {event.from_zone[1]}] → [{event.to_zone[0]}, {event.to_zone[1]}]
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {event.result || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
