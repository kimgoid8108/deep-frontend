/**
 * 공 상태 관리
 * 공 소유 상태를 명확히 하고, 상대 팀 압박/탈취 로직 지원
 */

export type BallState = 'owned' | 'moving' | 'free';

export interface Ball {
  ownerId: { team: string; playerId: number } | null;
  position: number[];  // [x, y]
  state: BallState;
  movingFrom?: number[];  // 이동 시작 위치
  movingTo?: number[];    // 이동 목표 위치
}

/**
 * 이벤트에서 공 소유자 추출
 */
export function extractBallOwner(event: any): { team: string; playerId: number } | null {
  if (!event) return null;

  // move, pass, shoot 이벤트에서 공 소유자 추출
  if (event.type === 'move' || event.type === 'pass' || event.type === 'shoot') {
    return {
      team: event.team,
      playerId: event.player_id,
    };
  }

  return null;
}

/**
 * 이벤트에서 공 상태 결정
 */
export function getBallState(event: any): BallState {
  if (!event) return 'free';

  if (event.type === 'pass' || event.type === 'shoot') {
    return 'moving';
  }

  if (event.type === 'move') {
    return 'owned';
  }

  return 'free';
}

/**
 * 이벤트 시퀀스에서 현재 공 상태 계산
 */
export function calculateBallState(
  events: any[],
  currentStep: number
): Ball {
  if (events.length === 0 || currentStep < 0) {
    return {
      ownerId: null,
      position: [3, 2],  // 중앙
      state: 'free',
    };
  }

  // 현재 step까지의 이벤트로 공 상태 추적
  let ball: Ball = {
    ownerId: null,
    position: [3, 2],
    state: 'free',
  };

  for (let i = 0; i <= currentStep && i < events.length; i++) {
    const event = events[i];

    if (event.type === 'move') {
      // 공 소유자가 이동
      ball.ownerId = {
        team: event.team,
        playerId: event.player_id,
      };
      ball.position = event.to_zone;
      ball.state = 'owned';
      ball.movingFrom = undefined;
      ball.movingTo = undefined;
    } else if (event.type === 'pass') {
      // 패스: 이동 중
      ball.state = 'moving';
      ball.movingFrom = event.from_zone || ball.position;
      ball.movingTo = event.to_zone;

      // 패스 성공 시 새로운 소유자
      if (event.result === 'success') {
        ball.ownerId = {
          team: event.team,
          playerId: event.player_id,
        };
        ball.position = event.to_zone;
        ball.state = 'owned';
      }
    } else if (event.type === 'shoot') {
      // 슛: 이동 중
      ball.state = 'moving';
      ball.movingFrom = event.from_zone || ball.position;
      ball.movingTo = event.to_zone;

      // 골 성공 시 공 소유자 없음 (골대에 들어감)
      if (event.result === 'goal') {
        ball.ownerId = null;
        ball.state = 'free';
      } else {
        // 슛 실패 시 공 위치는 목표 지점
        ball.position = event.to_zone;
        ball.state = 'free';
      }
    }
  }

  return ball;
}
