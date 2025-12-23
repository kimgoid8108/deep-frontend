/**
 * 팀 전술 지시 상태 관리
 * 감독모드에서 설정하는 전술 값들
 */

export interface TeamInstruction {
  // 공격 성향: 안정/균형/공격
  attackStyle: 'defensive' | 'balanced' | 'aggressive';

  // 압박 강도: 낮/중/높
  pressingIntensity: 'low' | 'medium' | 'high';

  // 패스 성향: 짧게/균형/전환
  passStyle: 'short' | 'balanced' | 'direct';

  // 수비 라인: 낮/보통/높
  defenseLine: 'low' | 'medium' | 'high';
}

export const DEFAULT_INSTRUCTION: TeamInstruction = {
  attackStyle: 'balanced',
  pressingIntensity: 'medium',
  passStyle: 'balanced',
  defenseLine: 'medium',
};

/**
 * 프리셋 전술
 */
export const TACTIC_PRESETS: { [key: string]: TeamInstruction } = {
  possession: {
    attackStyle: 'balanced',
    pressingIntensity: 'medium',
    passStyle: 'short',
    defenseLine: 'medium',
  },
  counter: {
    attackStyle: 'aggressive',
    pressingIntensity: 'low',
    passStyle: 'direct',
    defenseLine: 'low',
  },
  allIn: {
    attackStyle: 'aggressive',
    pressingIntensity: 'high',
    passStyle: 'balanced',
    defenseLine: 'high',
  },
  parkTheBus: {
    attackStyle: 'defensive',
    pressingIntensity: 'high',
    passStyle: 'short',
    defenseLine: 'low',
  },
  gegenpress: {
    attackStyle: 'balanced',
    pressingIntensity: 'high',
    passStyle: 'balanced',
    defenseLine: 'medium',
  },
  tikiTaka: {
    attackStyle: 'balanced',
    pressingIntensity: 'medium',
    passStyle: 'short',
    defenseLine: 'high',
  },
};
