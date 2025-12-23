/**
 * Football Manager 스타일 자동 패스 판단 시스템
 * 공 소유자가 상황에 따라 자동으로 패스를 선택
 */

import { PlayerState } from './PositioningSystem';
import { Ball } from './BallState';

export interface PassCandidate {
  player: PlayerState;
  distance: number;
  score: number;  // 패스 우선순위 점수
  isInAttackDirection: boolean;
  pressureCount: number;  // 주변 압박자 수
}

export interface PassDecision {
  shouldPass: boolean;
  targetPlayer: PlayerState | null;
  passSuccessProbability: number;
  reason: string;
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
 * 슛 가능 여부 판단
 */
function isShootable(
  ballOwner: PlayerState,
  fieldWidth: number,
  fieldHeight: number
): boolean {
  const [x, y] = ballOwner.baseZone;
  const isTeamA = ballOwner.team === 'A';

  // 골대 근처에 있고, 골대 방향을 향하고 있는지 확인
  if (isTeamA) {
    // 팀 A는 오른쪽 골대(x=5)를 향함
    return x >= 4 && y >= 1 && y <= 2;
  } else {
    // 팀 B는 왼쪽 골대(x=0)를 향함
    return x <= 1 && y >= 1 && y <= 2;
  }
}

/**
 * 압박 강도 계산 (주변 상대 선수 수)
 */
function calculatePressure(
  ballOwner: PlayerState,
  allPlayers: PlayerState[],
  pressureRadius: number = 1.5
): number {
  let pressureCount = 0;

  for (const player of allPlayers) {
    if (player.team === ballOwner.team) continue;  // 같은 팀 제외
    if (player.playerId === ballOwner.playerId) continue;

    const distance = getDistance(ballOwner.baseZone, player.baseZone);
    if (distance <= pressureRadius) {
      pressureCount++;
    }
  }

  return pressureCount;
}

/**
 * 공격 방향에 있는지 확인
 */
function isInAttackDirection(
  ballOwner: PlayerState,
  candidate: PlayerState,
  fieldWidth: number
): boolean {
  const isTeamA = ballOwner.team === 'A';
  const ownerX = ballOwner.baseZone[0];
  const candidateX = candidate.baseZone[0];

  if (isTeamA) {
    // 팀 A는 오른쪽(x 증가)이 공격 방향
    return candidateX > ownerX;
  } else {
    // 팀 B는 왼쪽(x 감소)이 공격 방향
    return candidateX < ownerX;
  }
}

/**
 * 패스 후보 선정
 */
export function findPassCandidates(
  ballOwner: PlayerState,
  allPlayers: PlayerState[],
  fieldWidth: number,
  fieldHeight: number
): PassCandidate[] {
  const candidates: PassCandidate[] = [];
  const ownerZone = ballOwner.baseZone;

  // 같은 팀 선수 중 후보 찾기
  for (const player of allPlayers) {
    // 공 소유자 제외
    if (player.team !== ballOwner.team || player.playerId === ballOwner.playerId) {
      continue;
    }

    const distance = getDistance(ownerZone, player.baseZone);

    // 너무 가까운 선수 제외 (1칸 이내)
    if (distance < 1.0) continue;

    // 너무 먼 선수 제외 (3.5칸 이상)
    if (distance > 3.5) continue;

    // 시야 범위 확인 (간단한 체크)
    const dx = Math.abs(player.baseZone[0] - ownerZone[0]);
    const dy = Math.abs(player.baseZone[1] - ownerZone[1]);
    if (dx > 3 || dy > 2) continue;  // 시야 범위 밖

    // 주변 압박자 수 계산
    let pressureCount = 0;
    for (const otherPlayer of allPlayers) {
      if (otherPlayer.team === player.team) continue;
      const otherDistance = getDistance(player.baseZone, otherPlayer.baseZone);
      if (otherDistance <= 1.5) {
        pressureCount++;
      }
    }

    // 공격 방향 확인
    const inAttackDirection = isInAttackDirection(ballOwner, player, fieldWidth);

    // 우선순위 점수 계산
    let score = 0;

    // 포지션 가중치
    if (player.position === 'CM' || player.position === 'FW') {
      score += 30;
    } else if (player.position === 'DF') {
      score += 15;
    } else if (player.position === 'GK') {
      score += 5;
    }

    // 공격 방향 가중치
    if (inAttackDirection) {
      score += 20;
    }

    // 압박자 없는 선수 우선
    if (pressureCount === 0) {
      score += 25;
    } else {
      score -= pressureCount * 10;  // 압박자 많을수록 감점
    }

    // 거리 가중치 (적당한 거리 선호: 1.5~2.5칸)
    if (distance >= 1.5 && distance <= 2.5) {
      score += 15;
    } else if (distance < 1.5) {
      score -= 10;  // 너무 가까움
    } else {
      score -= 5;  // 너무 멀음
    }

    candidates.push({
      player,
      distance,
      score,
      isInAttackDirection: inAttackDirection,
      pressureCount,
    });
  }

  // 점수 순으로 정렬
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * 패스 성공 확률 계산
 */
export function calculatePassSuccessProbability(
  passer: PlayerState,
  receiver: PassCandidate,
  baseSuccessRate: number = 0.75
): number {
  let probability = baseSuccessRate;

  // 거리에 따른 감소
  if (receiver.distance > 2.5) {
    probability -= 0.15;
  } else if (receiver.distance > 2.0) {
    probability -= 0.10;
  }

  // 압박자 수에 따른 감소
  probability -= receiver.pressureCount * 0.08;

  // receiver의 위치 안정성 (움직임이 적을수록 좋음)
  const receiverMovement = Math.abs(receiver.player.microOffset[0]) +
                          Math.abs(receiver.player.microOffset[1]);
  if (receiverMovement > 0.5) {
    probability -= 0.05;
  }

  // 최소/최대 확률 제한
  return Math.max(0.3, Math.min(0.95, probability));
}

/**
 * 팀의 판단자(Decision Maker) 찾기
 * CM이 있으면 공과 가장 가까운 CM 또는 중앙에 가장 가까운 CM 선택
 */
export function findDecisionMaker(
  team: string,
  ballPosition: number[],
  allPlayers: PlayerState[],
  fieldWidth: number,
  fieldHeight: number
): PlayerState | null {
  // 같은 팀 CM 찾기
  const teamCMs = allPlayers.filter(
    (p) => p.team === team && p.position === 'CM'
  );

  if (teamCMs.length === 0) {
    return null; // CM이 없으면 판단자 없음
  }

  if (teamCMs.length === 1) {
    return teamCMs[0]; // CM이 1명이면 그대로
  }

  // CM이 여러 명이면:
  // 1. 공과 가장 가까운 CM
  // 2. 공이 없거나 거리가 같으면 중앙에 가장 가까운 CM

  let closestCM: PlayerState | null = null;
  let minDistance = Infinity;
  const centerX = fieldWidth / 2;
  const centerY = fieldHeight / 2;

  for (const cm of teamCMs) {
    // 공과의 거리
    const distanceToBall = getDistance(ballPosition, cm.baseZone);

    // 중앙과의 거리
    const distanceToCenter = getDistance([centerX, centerY], cm.baseZone);

    // 공과의 거리가 더 가까우면 우선
    if (distanceToBall < minDistance) {
      minDistance = distanceToBall;
      closestCM = cm;
    } else if (distanceToBall === minDistance && closestCM) {
      // 거리가 같으면 중앙에 더 가까운 CM 선택
      const currentCenterDist = getDistance([centerX, centerY], closestCM.baseZone);
      if (distanceToCenter < currentCenterDist) {
        closestCM = cm;
      }
    }
  }

  return closestCM;
}

/**
 * 패스 판단 메인 로직 (팀 단위 판단)
 * ⚠️ 중요: 판단은 팀의 CM(Decision Maker)이 하고, 공 소유자는 실행만 함
 * 공 소유자는 판단하지 않음
 */
export function decidePass(
  team: string,  // 공 소유 팀 (ballOwner 대신 팀만 받음)
  allPlayers: PlayerState[],
  ball: Ball,
  fieldWidth: number,
  fieldHeight: number
): PassDecision {
  // 공이 이동 중이면 패스 불가
  if (ball.state === 'moving') {
    return {
      shouldPass: false,
      targetPlayer: null,
      passSuccessProbability: 0,
      reason: '공이 이동 중입니다',
    };
  }

  // 공 소유자 찾기 (실행용, 판단용 아님)
  const ballOwner = ball.ownerId;
  if (!ballOwner || ballOwner.team !== team) {
    return {
      shouldPass: false,
      targetPlayer: null,
      passSuccessProbability: 0,
      reason: '공 소유자가 없거나 팀이 일치하지 않습니다',
    };
  }

  const ballOwnerPlayer = allPlayers.find(
    (p) => p.team === ballOwner.team && p.playerId === ballOwner.playerId
  );

  if (!ballOwnerPlayer) {
    return {
      shouldPass: false,
      targetPlayer: null,
      passSuccessProbability: 0,
      reason: '공 소유자를 찾을 수 없습니다',
    };
  }

  // ⭐ 팀 판단자(Decision Maker) 찾기 - CM이 판단자
  const decisionMaker = findDecisionMaker(
    team,
    ball.position,
    allPlayers,
    fieldWidth,
    fieldHeight
  );

  // 판단자가 없으면 (CM이 없으면) 패스하지 않음 (공 소유자가 판단하지 않음)
  if (!decisionMaker) {
    return {
      shouldPass: false,
      targetPlayer: null,
      passSuccessProbability: 0,
      reason: '팀에 판단자(CM)가 없습니다',
    };
  }

  // 판단자는 CM이므로, CM 관점에서 판단
  const decisionPlayer = decisionMaker;

  // 1. 슛 가능 여부 확인 (공 소유자 기준 - 실행 가능 여부만 확인)
  if (isShootable(ballOwnerPlayer, fieldWidth, fieldHeight)) {
    return {
      shouldPass: false,
      targetPlayer: null,
      passSuccessProbability: 0,
      reason: '슛 가능 위치',
    };
  }

  // 2. 압박 강도 확인 (공 소유자 기준 - 상황 파악용)
  const pressure = calculatePressure(ballOwnerPlayer, allPlayers);

  // 3. 패스 후보 찾기 (판단자 관점에서)
  // 판단자가 있으면 판단자 기준으로, 없으면 공 소유자 기준으로
  const candidates = findPassCandidates(decisionPlayer, allPlayers, fieldWidth, fieldHeight);

  if (candidates.length === 0) {
    return {
      shouldPass: false,
      targetPlayer: null,
      passSuccessProbability: 0,
      reason: '패스 후보 없음',
    };
  }

  // 4. 최고 후보 선택
  const bestCandidate = candidates[0];
  // 패스 성공 확률은 공 소유자(실행자) 기준으로 계산
  const passProbability = calculatePassSuccessProbability(ballOwnerPlayer, bestCandidate);

  // 5. 패스 결정 로직 (팀 단위 판단)
  let shouldPass = false;
  let reason = '';

  // 판단자가 있으면 더 적극적으로 패스 (CM 관점)
  const isDecisionMakerActive = decisionMaker !== null;
  const passAggressiveness = isDecisionMakerActive ? 0.15 : 0.1; // CM이 있으면 15% 확률 증가

  if (pressure >= 2) {
    // 강한 압박: 무조건 패스
    shouldPass = true;
    reason = `강한 압박 (${pressure}명)${isDecisionMakerActive ? ' [CM 판단]' : ''}`;
  } else if (pressure >= 1 && passProbability > 0.6) {
    // 약한 압박 + 높은 성공률
    shouldPass = true;
    reason = `압박 중 (${pressure}명), 성공률 ${(passProbability * 100).toFixed(0)}%${isDecisionMakerActive ? ' [CM 판단]' : ''}`;
  } else if (passProbability > 0.8 && bestCandidate.isInAttackDirection) {
    // 매우 높은 성공률 + 공격 방향
    shouldPass = true;
    reason = `좋은 패스 기회 (성공률 ${(passProbability * 100).toFixed(0)}%)${isDecisionMakerActive ? ' [CM 판단]' : ''}`;
  } else if (pressure === 0 && Math.random() < passAggressiveness) {
    // 압박 없을 때 가끔 패스 (CM이 있으면 더 적극적)
    shouldPass = true;
    reason = `공격 전개${isDecisionMakerActive ? ' [CM 판단]' : ''}`;
  } else if (isDecisionMakerActive && bestCandidate.player.position === 'CM') {
    // CM 판단자가 있고, 후보가 CM이면 더 적극적으로 패스 (팀 플레이)
    if (passProbability > 0.7 && Math.random() < 0.3) {
      shouldPass = true;
      reason = `CM 간 연계 [CM 판단]`;
    }
  } else if (isDecisionMakerActive && bestCandidate.player.position === 'FW') {
    // CM 판단자가 있고, 후보가 FW이면 전방으로 패스 (공격 전개)
    if (passProbability > 0.65 && Math.random() < 0.25) {
      shouldPass = true;
      reason = `전방 전개 [CM 판단]`;
    }
  }

  return {
    shouldPass,
    targetPlayer: shouldPass ? bestCandidate.player : null,
    passSuccessProbability: passProbability,
    reason,
  };
}
