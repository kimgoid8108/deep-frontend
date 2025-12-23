import { useState, useEffect, useRef, useMemo } from 'react';
import AnimatedGameField from './AnimatedGameField';
import {
  PlayerState,
  PositioningContext,
  updatePlayerPositioning,
  PlayerIntent,
} from './PositioningSystem';
import { calculateBallState, Ball } from './BallState';
import { decidePass, PassDecision } from './PassDecisionSystem';

interface Event {
  t: number;
  type: string;
  team: string;
  player_id: number;
  from_zone: number[];
  to_zone: number[];
  result: string | null;
}

import { TeamInstruction } from './TeamInstruction';

interface SimulationViewerProps {
  events: Event[];
  teamInstruction?: TeamInstruction;
  playbackSpeed?: number;
  onStepChange?: (step: number) => void;
  onBallOwnerChange?: (team: string | null) => void;
  onHighlight?: (highlight: {
    id: string;
    time: number;
    message: string;
    type: 'goal' | 'tackle' | 'pass' | 'miss' | 'info';
  }) => void;
}

const FIELD_WIDTH = 6;
const FIELD_HEIGHT = 5;

// 7명 선수 시스템: GK(0), DF(1,2), CM(3,4), FW(5,6)
const POSITION_MAP: { [key: number]: string } = {
  0: 'GK',
  1: 'DF',
  2: 'DF',
  3: 'CM',
  4: 'CM',
  5: 'FW',
  6: 'FW',
};

// 초기 위치 설정 (7명)
const getInitialPositions = () => {
  return {
    // 팀 A (왼쪽에서 오른쪽으로 공격)
    'A-0': [0, 2], // GK
    'A-1': [1, 1], // DF
    'A-2': [1, 3], // DF
    'A-3': [2, 1], // CM
    'A-4': [2, 3], // CM
    'A-5': [3, 1], // FW
    'A-6': [3, 3], // FW
    // 팀 B (오른쪽에서 왼쪽으로 수비)
    'B-0': [5, 2], // GK
    'B-1': [4, 1], // DF
    'B-2': [4, 3], // DF
    'B-3': [3, 1], // CM
    'B-4': [3, 3], // CM
    'B-5': [2, 1], // FW
    'B-6': [2, 3], // FW
  };
};

export default function SimulationViewer({
  events,
  teamInstruction,
  playbackSpeed: externalPlaybackSpeed = 1,
  onStepChange,
  onBallOwnerChange,
  onHighlight,
}: SimulationViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms
  const [internalPlaybackSpeed, setInternalPlaybackSpeed] = useState(1);
  const playbackSpeed = externalPlaybackSpeed || internalPlaybackSpeed;

  // currentStep 변경 시 부모에게 알림
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const animationQueueRef = useRef<NodeJS.Timeout[]>([]);

  // 상시 포지셔닝 시스템
  const [playerStates, setPlayerStates] = useState<PlayerState[]>([]);
  const positioningIntervalRef = useRef<number | null>(null);
  const lastPositioningUpdate = useRef<number>(Date.now());

  // 패스 판단 시스템
  const [passDecision, setPassDecision] = useState<PassDecision | null>(null);
  const [passAnimation, setPassAnimation] = useState<{
    isActive: boolean;
    fromZone: number[];
    toZone: number[];
    startTime: number;
    duration: number;
    success: boolean;
  } | null>(null);
  const lastPassCheck = useRef<number>(0);
  const passCheckInterval = 500; // ⚠️ 패스 전용 모드: 500ms마다 패스 판단 (300-600ms 범위)

  // 현재 step까지의 이벤트로 상태 재구성
  const currentEvents = useMemo(() => {
    return events.slice(0, currentStep + 1);
  }, [events, currentStep]);

  // 선수 위치 추적 (7명 시스템) - useMemo로 최적화
  const playerPositions = useMemo(() => {
    const positions: { [key: string]: number[] } = {};
    const initialPositions = getInitialPositions();

    // GK 위치 제한 함수 (골대 근처에 고정)
    const constrainGKPosition = (team: string, zone: number[]): number[] => {
      const [x, y] = zone;
      // 팀 A의 GK는 왼쪽 끝(x=0)에 고정, y는 1~2 범위
      if (team === 'A') {
        return [0, Math.max(1, Math.min(2, y))];
      }
      // 팀 B의 GK는 오른쪽 끝(x=5)에 고정, y는 1~2 범위
      else {
        return [5, Math.max(1, Math.min(2, y))];
      }
    };

    // 이벤트를 순회하며 위치 업데이트
    currentEvents.forEach((event) => {
      const key = `${event.team}-${event.player_id}`;
      if (!positions[key]) {
        positions[key] = initialPositions[key] || [0, 0];
      }

      if (event.type === 'move' || event.type === 'pass') {
        const newZone = event.to_zone;
        // GK인 경우 골대 근처로 위치 제한
        if (event.player_id === 0) {
          positions[key] = constrainGKPosition(event.team, newZone);
        } else {
          positions[key] = newZone;
        }
      }
    });

    // 초기화되지 않은 선수는 초기 위치 사용
    Object.keys(initialPositions).forEach((key) => {
      if (!positions[key]) {
        positions[key] = initialPositions[key];
      }
      // GK는 항상 골대 근처로 보정
      const [team, playerIdStr] = key.split('-');
      const playerId = parseInt(playerIdStr);
      if (playerId === 0) {
        positions[key] = constrainGKPosition(team, positions[key]);
      }
    });

    return positions;
  }, [currentEvents]);

  // GameField 컴포넌트용 선수 배열 생성 (기본 위치)
  const basePlayers = useMemo(() => {
    return Object.keys(playerPositions).map((key) => {
      const [team, playerIdStr] = key.split('-');
      const playerId = parseInt(playerIdStr);
      return {
        team,
        position: POSITION_MAP[playerId] || 'UNK',
        playerId,
        zone: playerPositions[key],
      };
    });
  }, [playerPositions]);

  // 상시 포지셔닝으로 선수 상태 초기화/업데이트 (기본 위치 변경 시)
  useEffect(() => {
    if (basePlayers.length === 0) return;

    setPlayerStates((prevStates) => {
      const newPlayerStates: PlayerState[] = basePlayers.map((player) => {
        const existing = prevStates.find(
          (p) => p.team === player.team && p.playerId === player.playerId
        );

        // 기본 위치가 변경되었는지 확인
        const baseZoneChanged = !existing ||
          JSON.stringify(existing.baseZone) !== JSON.stringify(player.zone);

        return {
          team: player.team,
          position: player.position,
          playerId: player.playerId,
          baseZone: player.zone,  // 이벤트 기반 기본 위치
          microOffset: [0, 0], // ⚠️ 패스 전용 모드: 모든 선수 고정 위치
          intent: existing?.intent || 'idle',
          lastUpdate: existing?.lastUpdate || Date.now(),
        };
      });

      return newPlayerStates;
    });
  }, [basePlayers]);


  // 상시 포지셔닝 루프 (Football Manager 스타일)
  useEffect(() => {
    // 항상 포지셔닝 활성화 (재생 중이 아니어도)
    const updatePositioning = () => {
      const currentTime = Date.now();

      // ref에서 최신 값 가져오기
      const latestEvents = currentEventsRef.current;
      const latestBallZone = ballZoneRef.current;
      const latestBallOwner = ballOwnerRef.current;
      const latestBallState = ballStateRef.current;

      // 공격 팀 결정 (마지막 이벤트 기준)
      const lastEvent = latestEvents[latestEvents.length - 1];
      const attackingTeam = lastEvent?.team || 'A';

      // 포지셔닝 컨텍스트
      const context: PositioningContext = {
        ballZone: latestBallZone,
        ballOwner: latestBallOwner,
        ballState: latestBallState,
        attackingTeam,
        fieldWidth: FIELD_WIDTH,
        fieldHeight: FIELD_HEIGHT,
        playerStates: [],  // updatePlayerPositioning 내부에서 채워짐
      };

      // 선수 포지셔닝 업데이트
      setPlayerStates((prevStates) => {
        if (prevStates.length === 0) return prevStates;

        // 컨텍스트에 playerStates 추가
        context.playerStates = prevStates;
        const updated = updatePlayerPositioning(prevStates, context, currentTime);

        // ⭐ 팀 단위 패스 판단 (공 소유자가 판단하지 않음)
        // 패스 판단은 팀의 CM(Decision Maker)이 하고, 공 소유자는 실행만 함
        if (latestBallOwner && latestBallState === 'owned' && !passAnimation?.isActive) {
          const timeSinceLastCheck = currentTime - lastPassCheck.current;

          if (timeSinceLastCheck >= passCheckInterval) {
            const ballOwnerPlayer = updated.find(
              (p) => p.team === latestBallOwner.team && p.playerId === latestBallOwner.playerId
            );

            if (ballOwnerPlayer) {
              const currentBall: Ball = {
                ownerId: latestBallOwner,
                position: latestBallZone,
                state: latestBallState,
              };

              // ⭐ 팀 단위 판단: 공 소유자가 아닌 팀을 전달
              const decision = decidePass(
                latestBallOwner.team,  // 팀만 전달 (공 소유자 아님)
                updated,
                currentBall,
                FIELD_WIDTH,
                FIELD_HEIGHT
              );

              setPassDecision(decision);

              // 패스 실행 (공 소유자가 지시를 실행)
              if (decision.shouldPass && decision.targetPlayer) {
                const passSuccess = Math.random() < decision.passSuccessProbability;

                setPassAnimation({
                  isActive: true,
                  fromZone: ballOwnerPlayer.baseZone,
                  toZone: decision.targetPlayer.baseZone,
                  startTime: currentTime,
                  duration: 400, // 400ms
                  success: passSuccess,
                });

                lastPassCheck.current = currentTime;
              }
            }
          }
        }

        return updated;
      });

      lastPositioningUpdate.current = currentTime;
      positioningIntervalRef.current = requestAnimationFrame(updatePositioning);
    };

    // 포지셔닝 루프 시작
    positioningIntervalRef.current = requestAnimationFrame(updatePositioning);

    return () => {
      if (positioningIntervalRef.current) {
        cancelAnimationFrame(positioningIntervalRef.current);
        positioningIntervalRef.current = null;
      }
    };
  }, []); // 의존성 없음 - ref를 통해 최신 값 접근

  // 최종 선수 위치 계산 (기본 위치 + 미세 조정)
  const players = useMemo(() => {
    if (playerStates.length === 0) {
      // playerStates가 아직 초기화되지 않았으면 기본 위치 사용
      return basePlayers.map((p) => ({ ...p, intent: undefined }));
    }

    return playerStates.map((state) => {
      const [baseX, baseY] = state.baseZone;
      const [offsetX, offsetY] = state.microOffset;

      return {
        team: state.team,
        position: state.position,
        playerId: state.playerId,
        zone: [
          Math.max(0, Math.min(FIELD_WIDTH - 1, baseX + offsetX)),
          Math.max(0, Math.min(FIELD_HEIGHT - 1, baseY + offsetY)),
        ],
        intent: state.intent,  // 디버그용
      };
    });
  }, [playerStates, basePlayers]);

  // 공 상태 계산 (BallState 사용)
  const baseBallState = useMemo(() => {
    return calculateBallState(events, currentStep);
  }, [events, currentStep]);

  // 공 소유 팀 변경 시 부모에게 알림
  useEffect(() => {
    if (onBallOwnerChange) {
      onBallOwnerChange(baseBallState.ownerId?.team || null);
    }
  }, [baseBallState.ownerId?.team, onBallOwnerChange]);

  // 패스 애니메이션 완료 처리
  useEffect(() => {
    if (passAnimation?.isActive) {
      const elapsed = Date.now() - passAnimation.startTime;
      if (elapsed >= passAnimation.duration) {
        // 패스 애니메이션 완료
        if (passAnimation.success && passDecision?.targetPlayer) {
          // 패스 성공: 공 소유권 이전
          // (ballState는 다음 프레임에서 자동 업데이트됨)
        } else {
          // 패스 실패: 인터셉트 또는 미스패스
          // (공 소유권은 그대로 유지하거나 가장 가까운 선수에게)
        }

        setPassAnimation(null);
        setPassDecision(null);

        // ⚠️ 패스 전용 모드: 패스 완료 후 즉시 다시 패스 판단 가능하도록
        // (다음 프레임에서 바로 패스 판단 가능)
        lastPassCheck.current = Date.now() - passCheckInterval; // 강제로 다음 프레임에서 패스 판단
      }
    }
  }, [passAnimation, passDecision]);

  // 패스 애니메이션 중이면 공 상태 오버라이드
  const ballState = useMemo(() => {
    if (passAnimation?.isActive) {
      // 패스 애니메이션 중: 공이 이동 중
      const progress = Math.min(
        (Date.now() - passAnimation.startTime) / passAnimation.duration,
        1
      );

      // 공 위치 보간
      const [fromX, fromY] = passAnimation.fromZone;
      const [toX, toY] = passAnimation.toZone;
      const currentX = fromX + (toX - fromX) * progress;
      const currentY = fromY + (toY - fromY) * progress;

      return {
        ownerId: progress < 1 ? baseBallState.ownerId :
                 (passAnimation.success && passDecision?.targetPlayer ? {
                   team: passDecision.targetPlayer.team,
                   playerId: passDecision.targetPlayer.playerId,
                 } : null),
        position: [currentX, currentY],
        state: progress < 1 ? 'moving' as const : 'owned' as const,
        movingFrom: passAnimation.fromZone,
        movingTo: passAnimation.toZone,
      };
    }

    return baseBallState;
  }, [baseBallState, passAnimation, passDecision]);

  // 공 위치 및 소유자 추적 (BallState에서 추출)
  const ballZone = ballState.position;
  const ballOwner = ballState.ownerId;
  const ballStateType = ballState.state;

  // ballZone과 ballOwner를 ref로 저장 (의존성 문제 해결)
  const ballZoneRef = useRef(ballZone);
  const ballOwnerRef = useRef(ballOwner);
  const ballStateRef = useRef(ballStateType);
  const currentEventsRef = useRef(currentEvents);

  useEffect(() => {
    ballZoneRef.current = ballZone;
    ballOwnerRef.current = ballOwner;
    ballStateRef.current = ballStateType;
    currentEventsRef.current = currentEvents;
  }, [ballZone, ballOwner, ballStateType, currentEvents]);

  // 골 이벤트 확인
  const goalEvents = currentEvents.filter((e) => e.type === 'shoot' && e.result === 'goal');

  // 이벤트 재생 큐 시스템
  useEffect(() => {
    // 애니메이션 큐 초기화
    animationQueueRef.current.forEach((timer) => clearTimeout(timer));
    animationQueueRef.current = [];

    if (!isPlaying || currentStep >= events.length) {
      setCurrentEvent(null);
      return;
    }

    // 다음 이벤트 가져오기
    const nextEvent = events[currentStep];
    if (!nextEvent) {
      setIsPlaying(false);
      return;
    }

    // 현재 이벤트 설정 (애니메이션 시작)
    setCurrentEvent(nextEvent);

    // 이벤트 타입별 애니메이션 지속 시간
    const getAnimationDuration = (event: Event): number => {
      if (event.type === 'shoot') return 600;
      if (event.type === 'pass') return 350;
      if (event.type === 'move') {
        const position = POSITION_MAP[event.player_id] || 'CM';
        if (position === 'GK' || position === 'DF') return 600;
        if (position === 'CM') return 400;
        if (position === 'FW') return 300;
        return 400;
      }
      return 300;
    };

    const animationDuration = getAnimationDuration(nextEvent);
    const adjustedSpeed = speed / playbackSpeed;

    // 애니메이션 완료 후 다음 이벤트로 이동
    const timer = setTimeout(() => {
      setCurrentEvent(null);
      setCurrentStep((prev) => {
        if (prev < events.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, Math.max(animationDuration, adjustedSpeed));

    animationQueueRef.current.push(timer);

    return () => {
      animationQueueRef.current.forEach((t) => clearTimeout(t));
      animationQueueRef.current = [];
    };
  }, [isPlaying, currentStep, events, speed, playbackSpeed]);

  // 공 상태는 calculateBallState에서 자동 계산됨 (useMemo로 처리)

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

  const handleFastForward = () => {
    setIsPlaying(false);
    setCurrentStep(events.length - 1);
  };

  const handleSpeedToggle = () => {
    setPlaybackSpeed((prev) => (prev === 1 ? 2 : 1));
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* 게임 스타일 컨트롤 */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        borderRadius: '12px',
        border: '2px solid #0070f3',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {/* 재생 컨트롤 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            ⏮ 처음
          </button>
          <button
            onClick={handleStepBackward}
            disabled={currentStep === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: currentStep === 0 ? '#444' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            ⏪ 이전
          </button>
          {isPlaying ? (
            <button
              onClick={handlePause}
              style={{
                padding: '8px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              ⏸ 일시정지
            </button>
          ) : (
            <button
              onClick={handlePlay}
              style={{
                padding: '8px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              ▶ 재생
            </button>
          )}
          <button
            onClick={handleStepForward}
            disabled={currentStep >= events.length - 1}
            style={{
              padding: '8px 16px',
              backgroundColor: currentStep >= events.length - 1 ? '#444' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentStep >= events.length - 1 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            ⏩ 다음
          </button>
          <button
            onClick={handleFastForward}
            disabled={currentStep >= events.length - 1}
            style={{
              padding: '8px 16px',
              backgroundColor: currentStep >= events.length - 1 ? '#444' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentStep >= events.length - 1 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            ⏩ 빠르게 보기
          </button>
          <button
            onClick={handleSpeedToggle}
            style={{
              padding: '8px 16px',
              backgroundColor: playbackSpeed === 2 ? '#28a745' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            ⏩ {playbackSpeed}x
          </button>
        </div>

        {/* 속도 조절 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ color: '#fff', fontSize: '12px' }}>속도:</span>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            style={{ width: '120px' }}
          />
          <span style={{ color: '#00d4ff', fontSize: '12px', fontWeight: 'bold', minWidth: '50px' }}>
            {speed}ms
          </span>
        </div>

        {/* 진행 상태 */}
        <div style={{
          padding: '6px 12px',
          backgroundColor: 'rgba(0, 212, 255, 0.2)',
          borderRadius: '6px',
          color: '#00d4ff',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
        }}>
          Step: {String(currentStep + 1).padStart(2, '0')} / {String(events.length).padStart(2, '0')}
        </div>
      </div>

      {/* 골 알림 (애니메이션 효과) */}
      {goalEvents.length > 0 && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#ffd700',
            color: '#000',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px',
            borderRadius: '8px',
            fontSize: '20px',
            animation: 'goalFlash 0.5s ease-out',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
          }}
        >
          🎉 GOAL! (팀 {goalEvents[goalEvents.length - 1].team}) 🎉
        </div>
      )}

      <style jsx>{`
        @keyframes goalFlash {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* 애니메이션 게임 필드 */}
      <AnimatedGameField
        players={players}
        ballZone={ballZone}
        ballOwner={ballOwner}
        currentEvent={
          currentEvent
            ? {
                type: currentEvent.type,
                fromZone: currentEvent.from_zone,
                toZone: currentEvent.to_zone,
              }
            : null
        }
        passInfo={passAnimation ? {
          fromZone: passAnimation.fromZone,
          toZone: passAnimation.toZone,
          receiverId: passDecision?.targetPlayer ? {
            team: passDecision.targetPlayer.team,
            playerId: passDecision.targetPlayer.playerId,
          } : null,
          success: passAnimation.success,
        } : null}
        showPlayerLabels={true}  // 감독모드: 선수 라벨 표시
        showPassPath={true}  // 감독모드: 패스 경로 표시
        pressingPlayers={[]}  // TODO: 압박 중인 선수 계산
      />

      {/* 게임 스타일 이벤트 타임라인 */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{
          marginBottom: '16px',
          color: '#fff',
          backgroundColor: 'rgba(26, 26, 46, 0.9)',
          padding: '12px',
          borderRadius: '8px',
          border: '2px solid #0070f3',
          textAlign: 'center',
        }}>
          📋 경기 이벤트 로그
        </h3>
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '12px',
          backgroundColor: 'rgba(26, 26, 46, 0.05)',
          borderRadius: '8px',
        }}>
          {events.map((event, idx) => {
            const isActive = idx <= currentStep;
            const isGoal = event.type === 'shoot' && event.result === 'goal';
            const isSuccess = event.result === 'success' || event.result === 'goal';
            const isFail = event.result === 'fail' || event.result === 'miss';

            // 이벤트 타입별 색상
            const getEventColor = () => {
              if (event.type === 'move') return '#999'; // 회색
              if (event.type === 'pass') return '#0070f3'; // 파랑
              if (event.type === 'shoot') {
                return isSuccess ? '#28a745' : '#dc3545'; // 초록(성공) / 빨강(실패)
              }
              return '#666';
            };

            const eventColor = getEventColor();
            const position = POSITION_MAP[event.player_id] || 'UNK';

            // 이벤트 설명 텍스트
            const getEventText = () => {
              if (event.type === 'move') return `${position} 이동`;
              if (event.type === 'pass') return `${position} → 패스`;
              if (event.type === 'shoot') return `${position} 슛 시도`;
              return `${position} 행동`;
            };

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                  opacity: isActive ? 1 : 0.3,
                  padding: '10px 14px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '6px',
                  border: isActive ? `2px solid ${eventColor}` : '1px solid #ddd',
                  borderLeft: `4px solid ${isActive ? eventColor : '#ccc'}`,
                  fontFamily: 'monospace',
                  fontSize: '13px',
                }}
              >
                {/* 스텝 번호 */}
                <div style={{
                  minWidth: '40px',
                  textAlign: 'center',
                  marginRight: '12px',
                  color: eventColor,
                  fontWeight: 'bold',
                }}>
                  [{String(event.t).padStart(2, '0')}]
                </div>

                {/* 이벤트 텍스트 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#333', fontWeight: 'bold' }}>
                    {getEventText()}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    backgroundColor: event.team === 'A' ? '#0066ff' : '#ff3333',
                    color: 'white',
                    fontWeight: 'bold',
                  }}>
                    {event.team}
                  </span>
                </div>

                {/* 결과 표시 */}
                {event.result && (
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: isGoal ? '#ffd700' : isSuccess ? '#d4edda' : isFail ? '#f8d7da' : '#e0e0e0',
                    color: isGoal ? '#000' : isSuccess ? '#155724' : isFail ? '#721c24' : '#666',
                    minWidth: '60px',
                    textAlign: 'center',
                  }}>
                    {event.result === 'goal' ? '🎉 골!' :
                     event.result === 'success' ? '✓ 성공' :
                     event.result === 'fail' ? '✗ 실패' :
                     event.result === 'miss' ? '✗ 미스' :
                     event.result}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
