import { useState } from 'react';
import axios from 'axios';
import SimulationViewer from '../components/SimulationViewer';

const API_BASE_URL = 'http://localhost:8000';

interface PlayerInput {
  shooting: number;
  passing: number;
  finishing: number;
  defense: number;
}

interface RecommendResponse {
  action: string;
  reason: string;
  confidence?: number;
}

interface Event {
  t: number;
  type: string;
  team: string;
  player_id: number;
  from_zone: number[];
  to_zone: number[];
  result: string | null;
}

interface SimulateResponse {
  events: Event[];
  final_score: { A: number; B: number };
  used_action: string;
}

export default function Home() {
  const [playerInput, setPlayerInput] = useState<PlayerInput>({
    shooting: 50,
    passing: 50,
    finishing: 50,
    defense: 50,
  });

  const [recommendation, setRecommendation] = useState<RecommendResponse | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof PlayerInput, value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    setPlayerInput((prev) => ({ ...prev, [field]: clampedValue }));
  };

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<RecommendResponse>(
        `${API_BASE_URL}/recommend`,
        { player_input: playerInput }
      );
      setRecommendation(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '추천 요청 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<SimulateResponse>(
        `${API_BASE_URL}/simulate`,
        { player_input: playerInput }
      );
      setSimulationResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '시뮬레이션 실행 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>축구 선수 활용 추천 시스템</h1>

      {/* 입력 폼 */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>선수 능력치 입력</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {(['shooting', 'passing', 'finishing', 'defense'] as const).map((field) => (
            <div key={field}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {field === 'shooting' && '슛'}
                {field === 'passing' && '패스'}
                {field === 'finishing' && '골결정력'}
                {field === 'defense' && '수비'}
                {' '}({playerInput[field]})
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={playerInput[field]}
                onChange={(e) => handleInputChange(field, parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRecommend}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '처리 중...' : '추천 받기'}
          </button>
          <button
            onClick={handleSimulate}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '처리 중...' : '시뮬레이션 실행'}
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '5px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* 추천 결과 */}
      {recommendation && (
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
          <h2>추천 결과</h2>
          <p><strong>행동:</strong> {recommendation.action}</p>
          <p><strong>이유:</strong> {recommendation.reason}</p>
          {recommendation.confidence !== undefined && (
            <p><strong>신뢰도:</strong> {(recommendation.confidence * 100).toFixed(1)}%</p>
          )}
        </div>
      )}

      {/* 시뮬레이션 결과 */}
      {simulationResult && (
        <div>
          <h2>시뮬레이션 결과</h2>
          <p>
            <strong>최종 점수:</strong> 팀 A {simulationResult.final_score.A} - {simulationResult.final_score.B} 팀 B
          </p>
          <p><strong>사용된 행동:</strong> {simulationResult.used_action}</p>
          <SimulationViewer events={simulationResult.events} />
        </div>
      )}
    </div>
  );
}
