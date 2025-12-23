/**
 * Football Manager 스타일 상시 포지셔닝 시스템
 * 모든 선수가 이벤트와 무관하게 미세하게 움직임
 */

// ⚠️ 패스 전용 테스트 모드: 이동 로직 비활성화, 패스만 테스트
export const PASS_ONLY_MODE = true; // true로 설정하면 선수 이동 비활성화

export type PlayerIntent =
  | 'hold_goal'           // GK: 골대 지키기
  | 'hold_line'           // DF: 라인 유지
  | 'slide'               // DF: 좌우 슬라이드
  | 'create_passing_angle' // CM: 패스 각 만들기 (공 소유 팀)
  | 'maintain_triangle'    // CM: 삼각형 유지 (공 소유 팀)
  | 'cover_opposite_space' // CM: 공 반대편 하프 스페이스 커버 (공 미소유)
  | 'make_forward_run'     // FW: 전방 침투 (공 소유 팀)
  | 'hold_up_play'         // FW: 공 받을 위치 유지 (공 소유 팀)
  | 'press_forward'        // FW: 전방 압박 (공 미소유)
  | 'press'                // 압박 (상대 공 소유자에게)
  | 'tackle'               // 탈취 시도 (상대 공 소유자에게)
  | 'idle';                // 기본 (절대 사용하지 않음)

export interface PlayerState {
  team: string;
  position: string;
  playerId: number;
  baseZone: number[];  // 이벤트 기반 기본 위치
  microOffset: number[];  // 미세 위치 조정 (상시 포지셔닝)
  intent: PlayerIntent;
  lastUpdate: number;
  // 상태 변화 추적 (intent 재결정용)
  lastBallOwnerTeam?: string | null;
  lastBallZone?: number[];
  lastPressureState?: boolean;
  lastIntentChange?: number;  // 마지막 intent 변경 시간
}

export interface PositioningContext {
  ballZone: number[];
  ballOwner: { team: string; playerId: number } | null;
  ballState: 'owned' | 'moving' | 'free';
  attackingTeam: string;
  fieldWidth: number;
  fieldHeight: number;
  playerStates: PlayerState[];  // 모든 선수 상태 (거리 계산용)
}

/**
 * 두 위치 간 거리 계산
 */
function getDistance(pos1: number[], pos2: number[]): number {
  const dx = pos1[0] - pos2[0];
  const dy = pos1[1] - pos2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 패스 각이 좋은지 확인 (특정 선수 기준)
 */
function hasGoodPassingAngle(
  player: PlayerState,
  ballOwnerPlayer: PlayerState | undefined,
  allPlayers: PlayerState[]
): boolean {
  if (!ballOwnerPlayer) return false;

  const distance = getDistance(ballOwnerPlayer.baseZone, player.baseZone);
  // 적절한 거리(1.5~2.5칸)에 있고, 시야 범위 내
  return distance >= 1.5 && distance <= 2.5;
}

/**
 * 공 소유자가 압박 상태인지 확인
 */
function isBallOwnerUnderPressure(
  ballOwner: { team: string; playerId: number } | null,
  allPlayers: PlayerState[],
  pressureRadius: number = 1.5
): boolean {
  if (!ballOwner) return false;

  const ballOwnerPlayer = allPlayers.find(
    (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
  );

  if (!ballOwnerPlayer) return false;

  let pressureCount = 0;
  for (const player of allPlayers) {
    if (player.team === ballOwner.team) continue;
    const distance = getDistance(ballOwnerPlayer.baseZone, player.baseZone);
    if (distance <= pressureRadius) {
      pressureCount++;
    }
  }

  return pressureCount >= 1; // 1명 이상 압박 중
}

/**
 * 공 위치 존(Zone) 확인
 * 필드를 3개 존으로 나눔: 수비 존(0-2), 중앙 존(2-4), 공격 존(4-6)
 */
function getBallZone(ballZone: number[], fieldWidth: number): 'defense' | 'midfield' | 'attack' {
  const x = ballZone[0];
  const third = fieldWidth / 3;

  if (x < third) return 'defense';
  if (x < third * 2) return 'midfield';
  return 'attack';
}

/**
 * 상태 변화 감지
 */
function hasStateChanged(
  player: PlayerState,
  context: PositioningContext
): boolean {
  const { ballOwner, ballZone } = context;
  const currentBallOwnerTeam = ballOwner?.team || null;
  const currentBallZoneType = getBallZone(ballZone, context.fieldWidth);
  const currentPressureState = isBallOwnerUnderPressure(ballOwner, context.playerStates);

  // 공 소유 팀 변경
  if (player.lastBallOwnerTeam !== currentBallOwnerTeam) {
    return true;
  }

  // 공 위치 존 변경
  const lastBallZoneType = player.lastBallZone
    ? getBallZone(player.lastBallZone, context.fieldWidth)
    : null;
  if (lastBallZoneType !== currentBallZoneType) {
    return true;
  }

  // 압박 상태 변경
  if (player.lastPressureState !== currentPressureState) {
    return true;
  }

  // 일정 시간(3초)이 지나면 재평가
  const timeSinceLastChange = Date.now() - (player.lastIntentChange || 0);
  if (timeSinceLastChange > 3000) {
    return true;
  }

  return false;
}

/**
 * 수비 라인 높이 확인
 */
function getDefenseLineHeight(
  team: string,
  allPlayers: PlayerState[],
  fieldWidth: number
): 'high' | 'medium' | 'low' {
  // 상대 팀 DF들의 평균 x 위치
  const opponentDFs = allPlayers.filter(
    (p) => p.team !== team && p.position === 'DF'
  );

  if (opponentDFs.length === 0) return 'medium';

  const avgX = opponentDFs.reduce((sum, df) => sum + df.baseZone[0], 0) / opponentDFs.length;
  const third = fieldWidth / 3;

  if (avgX > third * 2) return 'high';  // 공격적으로 높음
  if (avgX < third) return 'low';      // 수비적으로 낮음
  return 'medium';
}

/**
 * 포지션별 기본 intent 결정 (압박/탈취 로직 포함)
 * ⚠️ 중요: 모든 선수는 반드시 하나의 intent를 가져야 함 (idle은 절대 반환하지 않음)
 */
export function getDefaultIntent(
  player: PlayerState,
  context: PositioningContext
): PlayerIntent {
  const { ballOwner, ballZone, ballState, attackingTeam, playerStates } = context;
  const { team, position, baseZone } = player;
  const hasBall = ballOwner?.team === team && ballOwner?.playerId === player.playerId;
  const teamHasBall = ballOwner && ballOwner.team === team && ballState === 'owned';
  const isOpponentHasBall = ballOwner && ballOwner.team !== team && ballState === 'owned';

  // 공을 가지고 있으면 특별한 intent
  if (hasBall) {
    if (position === 'GK') return 'hold_goal';
    if (position === 'DF') return 'hold_line';
    if (position === 'CM') return 'maintain_triangle'; // 공 소유 시 삼각형 유지
    if (position === 'FW') return 'hold_up_play'; // 공 소유 시 위치 유지
  }

  // ⚠️ 패스 전용 모드: 압박/탈취 로직 비활성화
  if (!PASS_ONLY_MODE) {
    // 상대가 공을 가지고 있을 때 압박/탈취 로직
    if (isOpponentHasBall && ballOwner) {
      const ballOwnerPlayer = playerStates.find(
        (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
      );

      if (ballOwnerPlayer) {
        const distanceToBall = getDistance(baseZone, ballOwnerPlayer.baseZone);

        // 가까운 선수는 탈취 시도, 멀리 있는 선수는 압박
        if (distanceToBall < 1.5) {
          // 매우 가까움: 탈취 시도
          if (position === 'DF' || position === 'CM' || position === 'FW') {
            return 'tackle';
          }
        } else if (distanceToBall < 2.5) {
          // 가까움: 압박
          if (position === 'DF' || position === 'CM' || position === 'FW') {
            return 'press';
          }
        }
      }
    }
  }

  // 기본 포지셔닝 (항상 하나의 intent 반환 보장)
  if (position === 'GK') {
    return 'hold_goal';
  } else if (position === 'DF') {
    return 'hold_line';
  } else if (position === 'CM') {
    // ⚠️ 패스 전용 모드: 기본 intent만 반환 (이동 로직 비활성화)
    if (PASS_ONLY_MODE) {
      return teamHasBall ? 'maintain_triangle' : 'cover_opposite_space';
    }

    // CM 이동 조건: "지금 공 소유자가 나에게 패스할 수 있는가?"

    // 상태 변화가 없고 intent가 유효하면 유지
    if (!hasStateChanged(player, context) && player.intent !== 'idle') {
      return player.intent;
    }

    if (teamHasBall && ballOwner) {
      const ballOwnerPlayer = playerStates.find(
        (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
      );

      if (ballOwnerPlayer) {
        // 공 소유자가 압박 중인가?
        const isUnderPressure = isBallOwnerUnderPressure(ballOwner, playerStates);

        if (isUnderPressure) {
          // 압박 중: 지원 위치로 이동
          return 'create_passing_angle';
        }

        // 패스 각이 있는가?
        const hasGoodAngle = hasGoodPassingAngle(player, ballOwnerPlayer, playerStates);

        if (hasGoodAngle) {
          // 좋은 각도: 삼각형 유지
          return 'maintain_triangle';
        } else {
          // 각도 없음: 각 만들기
          return 'create_passing_angle';
        }
      }
    } else {
      // 공 미소유 또는 공이 반대편
      const ballZoneType = getBallZone(ballZone, context.fieldWidth);
      const playerZoneType = getBallZone(baseZone, context.fieldWidth);

      if (ballZoneType !== playerZoneType) {
        // 공이 반대편: 반대편 커버
        return 'cover_opposite_space';
      } else {
        // 같은 존: 기본 커버
        return 'cover_opposite_space';
      }
    }
  } else if (position === 'FW') {
    // ⚠️ 패스 전용 모드: 기본 intent만 반환 (이동 로직 비활성화)
    if (PASS_ONLY_MODE) {
      return teamHasBall ? 'hold_up_play' : 'press_forward';
    }

    // FW 이동 조건: "지금 수비 라인을 흔들 수 있는가?"

    // 상태 변화가 없고 intent가 유효하면 유지
    if (!hasStateChanged(player, context) && player.intent !== 'idle') {
      return player.intent;
    }

    if (teamHasBall) {
      // 공 소유 팀: 수비 라인 높이 확인
      const defenseLineHeight = getDefenseLineHeight(team, playerStates, context.fieldWidth);

      if (defenseLineHeight === 'high') {
        // 수비 라인이 높음: 침투
        return 'make_forward_run';
      } else if (defenseLineHeight === 'low') {
        // 수비 라인이 낮음: 내려와서 받기
        return 'hold_up_play';
      } else {
        // 중간: 상황에 따라
        const shouldRun = Math.random() < 0.5;
        return shouldRun ? 'make_forward_run' : 'hold_up_play';
      }
    } else {
      // 공 미소유: 1차 압박 위치 이동
      return 'press_forward';
    }
  }

  // 절대 도달하지 않아야 하지만, 안전장치
  console.warn(`Unknown position: ${position}, defaulting to idle`);
  return 'hold_line'; // idle 대신 기본 동작
}

/**
 * Intent에 따른 미세 위치 조정 계산
 */
export function calculateMicroMovement(
  player: PlayerState,
  context: PositioningContext,
  time: number
): number[] {
  // ⚠️ 패스 전용 모드: 이동 비활성화
  if (PASS_ONLY_MODE) {
    return [0, 0]; // 모든 선수 고정 위치 유지
  }

  const { position, baseZone, intent, lastUpdate } = player;
  const { ballZone, ballOwner, fieldWidth, fieldHeight } = context;
  const [baseX, baseY] = baseZone;

  // 시간 기반 주기적 움직임 (사인파 사용)
  const timeDelta = (time - lastUpdate) / 1000; // 초 단위
  const cycle = Math.sin(timeDelta * 0.5) * 0.5; // 느린 주기

  let offsetX = 0;
  let offsetY = 0;

  switch (intent) {
    case 'hold_goal':
      // GK: 골대 중앙 기준으로 미세 이동 (y축만)
      offsetY = cycle * 0.3;
      break;

    case 'hold_line':
    case 'slide': {
      // DF: 공 위치 기준 좌우 슬라이드
      const ballX = ballZone[0];
      const slideDirection = ballX > baseX ? 1 : -1;
      offsetX = cycle * slideDirection * 0.4;
      // 라인 유지 (y축은 거의 변화 없음)
      offsetY = Math.sin(timeDelta * 0.3) * 0.2;
      break;
    }

    case 'create_passing_angle': {
      // CM: 패스 각 만들기 - 공 소유자 기준 삼각형 구조
      if (ballOwner) {
        const ballOwnerPlayer = context.playerStates.find(
          (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
        );

        if (ballOwnerPlayer) {
          const ownerX = ballOwnerPlayer.baseZone[0];
          const ownerY = ballOwnerPlayer.baseZone[1];

          // 공 소유자와의 거리 유지하면서 각도 조정
          const dx = ownerX - baseX;
          const dy = ownerY - baseY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 적절한 거리(1.5~2.5칸) 유지하면서 각도 조정
          if (distance < 1.5) {
            // 너무 가까우면 멀어지기
            offsetX = Math.sin(timeDelta * 0.5) * -Math.sign(dx) * 0.5;
            offsetY = Math.sin(timeDelta * 0.5) * -Math.sign(dy) * 0.5;
          } else if (distance > 2.5) {
            // 너무 멀면 가까워지기
            offsetX = Math.sin(timeDelta * 0.5) * Math.sign(dx) * 0.5;
            offsetY = Math.sin(timeDelta * 0.5) * Math.sign(dy) * 0.5;
          } else {
            // 적절한 거리면 좌우로 각도 조정
            offsetX = Math.sin(timeDelta * 0.6) * 0.5;
            offsetY = Math.cos(timeDelta * 0.6) * 0.4;
          }
        }
      }
      break;
    }

    case 'maintain_triangle': {
      // CM: 삼각형 유지 - 같은 팀 선수들과 삼각형 구조 유지
      if (ballOwner) {
        const ballOwnerPlayer = context.playerStates.find(
          (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
        );

        if (ballOwnerPlayer) {
          const ownerX = ballOwnerPlayer.baseZone[0];
          const ownerY = ballOwnerPlayer.baseZone[1];

          // 공 소유자와의 거리 유지 (1.5~2.5칸)
          const dx = ownerX - baseX;
          const dy = ownerY - baseY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 삼각형을 유지하기 위한 미세 조정
          const targetDistance = 2.0; // 목표 거리
          if (distance < targetDistance) {
            offsetX = Math.sin(timeDelta * 0.5) * -Math.sign(dx) * 0.4;
            offsetY = Math.sin(timeDelta * 0.5) * -Math.sign(dy) * 0.4;
          } else {
            offsetX = Math.sin(timeDelta * 0.5) * Math.sign(dx) * 0.4;
            offsetY = Math.sin(timeDelta * 0.5) * Math.sign(dy) * 0.4;
          }
        }
      }
      break;
    }

    case 'cover_opposite_space': {
      // CM: 공 반대편 하프 스페이스 커버
      const ballXPos = ballZone[0];
      const oppositeX = fieldWidth - 1 - ballXPos; // 공 반대편
      const oppositeDirection = oppositeX > baseX ? 1 : -1;

      // 공 반대편으로 이동하면서 하프 스페이스 커버
      offsetX = Math.sin(timeDelta * 0.5) * oppositeDirection * 0.5;
      offsetY = Math.sin(timeDelta * 0.6) * 0.4;
      break;
    }

    case 'make_forward_run': {
      // FW: 전방 침투 - 수비 뒷공간으로 침투
      const forwardDirection = player.team === 'A' ? 1 : -1;
      offsetX = Math.sin(timeDelta * 0.7) * forwardDirection * 0.6;
      offsetY = Math.sin(timeDelta * 0.8) * 0.4;
      break;
    }

    case 'hold_up_play': {
      // FW: 공 받을 위치 유지 - 공 소유자 주변에서 위치 조정
      if (ballOwner) {
        const ballOwnerPlayer = context.playerStates.find(
          (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
        );

        if (ballOwnerPlayer) {
          const ownerX = ballOwnerPlayer.baseZone[0];
          const ownerY = ballOwnerPlayer.baseZone[1];
          const forwardDir = player.team === 'A' ? 1 : -1;

          // 공 소유자 전방에서 위치 유지
          const targetX = ownerX + forwardDir * 1.5;
          const dx = targetX - baseX;
          const dy = ownerY - baseY;

          offsetX = Math.sin(timeDelta * 0.6) * Math.sign(dx) * 0.5;
          offsetY = Math.sin(timeDelta * 0.6) * Math.sign(dy) * 0.4;
        }
      }
      break;
    }

    case 'press_forward': {
      // FW: 전방 압박 - 공 위치 기준 전방으로 압박
      const pressForwardX = ballZone[0];
      const pressForwardY = ballZone[1];
      const forwardPressDx = pressForwardX - baseX;
      const forwardPressDy = pressForwardY - baseY;
      const forwardDir2 = player.team === 'A' ? 1 : -1;

      // 전방으로 압박하면서 공 위치로 접근
      offsetX = Math.sin(timeDelta * 0.7) * (Math.sign(forwardPressDx) + forwardDir2 * 0.3) * 0.5;
      offsetY = Math.sin(timeDelta * 0.7) * Math.sign(forwardPressDy) * 0.5;
      break;
    }

    case 'press':
      // 압박: 상대 공 소유자에게 접근
      if (context.ballOwner && context.ballState === 'owned') {
        const ballOwnerPlayer = context.playerStates.find(
          (p) => p.team === context.ballOwner!.team && p.playerId === context.ballOwner!.playerId
        );

        if (ballOwnerPlayer) {
          const ownerX = ballOwnerPlayer.baseZone[0];
          const ownerY = ballOwnerPlayer.baseZone[1];
          const pressDx = ownerX - baseX;
          const pressDy = ownerY - baseY;

          // 상대 선수에게 접근 (더 적극적으로)
          offsetX = Math.sin(timeDelta * 0.8) * Math.sign(pressDx) * 0.6;
          offsetY = Math.sin(timeDelta * 0.8) * Math.sign(pressDy) * 0.6;
        }
      } else {
        // 공 위치로 이동
        const pressX = ballZone[0];
        const pressY = ballZone[1];
        const pressDx = pressX - baseX;
        const pressDy = pressY - baseY;
        offsetX = Math.sin(timeDelta * 0.7) * Math.sign(pressDx) * 0.5;
        offsetY = Math.sin(timeDelta * 0.7) * Math.sign(pressDy) * 0.5;
      }
      break;

    case 'tackle':
      // 탈취 시도: 상대 공 소유자에게 매우 가까이 접근
      if (context.ballOwner && context.ballState === 'owned') {
        const ballOwnerPlayer = context.playerStates.find(
          (p) => p.team === context.ballOwner!.team && p.playerId === context.ballOwner!.playerId
        );

        if (ballOwnerPlayer) {
          const ownerX = ballOwnerPlayer.baseZone[0];
          const ownerY = ballOwnerPlayer.baseZone[1];
          const tackleDx = ownerX - baseX;
          const tackleDy = ownerY - baseY;

          // 매우 가까이 접근 (탈취 시도)
          offsetX = Math.sin(timeDelta * 1.0) * Math.sign(tackleDx) * 0.7;
          offsetY = Math.sin(timeDelta * 1.0) * Math.sign(tackleDy) * 0.7;
        }
      }
      break;

    default:
      // 절대 idle이 오면 안 되지만, 안전장치로 기본 움직임
      console.warn(`Unknown intent: ${intent}, using default movement`);
      offsetX = Math.sin(timeDelta * 0.4) * 0.4;
      offsetY = Math.cos(timeDelta * 0.4) * 0.4;
  }

  // 필드 범위 내로 제한
  const newX = Math.max(0, Math.min(fieldWidth - 1, baseX + offsetX));
  const newY = Math.max(0, Math.min(fieldHeight - 1, baseY + offsetY));

  return [newX - baseX, newY - baseY];
}

/**
 * 선수들의 상시 포지셔닝 업데이트
 */
export function updatePlayerPositioning(
  players: PlayerState[],
  context: PositioningContext,
  currentTime: number
): PlayerState[] {
  // ⚠️ 패스 전용 모드: 모든 선수 이동 완전 차단
  if (PASS_ONLY_MODE) {
    return players.map(player => ({
      ...player,
      microOffset: [0, 0], // 모든 선수 고정 위치
      lastUpdate: currentTime,
      // intent는 유지하되 이동은 없음
    }));
  }

  // 컨텍스트에 playerStates 추가 (거리 계산용)
  const contextWithPlayers = { ...context, playerStates: players };

  return players.map(player => {
    // Intent 업데이트 (player 객체 전체 전달)
    const newIntent = getDefaultIntent(player, contextWithPlayers);

    // Intent가 변경되었는지 확인
    const intentChanged = player.intent !== newIntent;

    // 미세 위치 조정 계산
    const microOffset = calculateMicroMovement(
      { ...player, intent: newIntent },
      contextWithPlayers,
      currentTime
    );

    // 상태 추적 업데이트
    const updatedPlayer: PlayerState = {
      ...player,
      intent: newIntent,
      microOffset,
      lastUpdate: currentTime,
      lastBallOwnerTeam: context.ballOwner?.team || null,
      lastBallZone: [...context.ballZone],
      lastPressureState: isBallOwnerUnderPressure(context.ballOwner, players),
      lastIntentChange: intentChanged ? currentTime : (player.lastIntentChange || currentTime),
    };

    return updatedPlayer;
  });
}
