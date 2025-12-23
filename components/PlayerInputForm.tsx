import React from 'react';

interface PlayerInput {
  shooting: number;
  passing: number;
  finishing: number;
  defense: number;
}

interface PlayerInputFormProps {
  playerInput: PlayerInput;
  onInputChange: (field: keyof PlayerInput, value: number) => void;
  onRecommend: () => void;
  onSimulate: () => void;
  loading: boolean;
  hasSimulationResult: boolean;
}

const FIELD_LABELS: Record<keyof PlayerInput, string> = {
  shooting: '슛',
  passing: '패스',
  finishing: '골결정력',
  defense: '수비',
};

const BUTTON_STYLES = {
  base: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  recommend: {
    backgroundColor: '#0070f3',
    boxShadow: '0 4px 8px rgba(0, 112, 243, 0.3)',
  },
  simulate: {
    backgroundColor: '#28a745',
    boxShadow: '0 4px 8px rgba(40, 167, 69, 0.3)',
  },
  resimulate: {
    backgroundColor: '#ff9800',
    boxShadow: '0 4px 8px rgba(255, 152, 0, 0.3)',
  },
  disabled: {
    backgroundColor: '#666',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};

export default function PlayerInputForm({
  playerInput,
  onInputChange,
  onRecommend,
  onSimulate,
  loading,
  hasSimulationResult,
}: PlayerInputFormProps) {
  return (
    <div style={{
      marginBottom: '30px',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: 'rgba(26, 26, 46, 0.95)',
      maxWidth: '600px',
      margin: '0 auto 30px',
    }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>선수 능력치 입력</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
        {(Object.keys(FIELD_LABELS) as Array<keyof PlayerInput>).map((field) => (
          <div key={field}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#fff' }}>
              {FIELD_LABELS[field]} ({playerInput[field]})
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={playerInput[field]}
              onChange={(e) => onInputChange(field, parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={onRecommend}
          disabled={loading}
          style={{
            ...BUTTON_STYLES.base,
            ...(loading ? BUTTON_STYLES.disabled : BUTTON_STYLES.recommend),
          }}
        >
          {loading ? '⏳ 처리 중...' : '▶ 추천 받기'}
        </button>
        <button
          onClick={onSimulate}
          disabled={loading}
          style={{
            ...BUTTON_STYLES.base,
            ...(loading ? BUTTON_STYLES.disabled : BUTTON_STYLES.simulate),
          }}
        >
          {loading ? '⏳ 시뮬레이션 중...' : '▶ 시뮬레이션 실행'}
        </button>
        {hasSimulationResult && (
          <button
            onClick={onSimulate}
            disabled={loading}
            style={{
              ...BUTTON_STYLES.base,
              ...BUTTON_STYLES.resimulate,
            }}
          >
            ⟳ 다시 시뮬레이션
          </button>
        )}
      </div>
    </div>
  );
}
