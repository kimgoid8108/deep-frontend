import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import SimulationViewer from '../components/SimulationViewer';
import TacticCard from '../components/TacticCard';
import HudBar from '../components/HudBar';
import CoachPanel from '../components/CoachPanel';
import Header from '../components/Header';
import PlayerInputForm from '../components/PlayerInputForm';
import FeedbackButtons from '../components/FeedbackButtons';
import ErrorMessage from '../components/ErrorMessage';
import DebugInfo from '../components/DebugInfo';
import { TeamInstruction, DEFAULT_INSTRUCTION } from '../components/TeamInstruction';
import { HighlightEvent } from '../components/CoachPanel';

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
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastApiCall, setLastApiCall] = useState<Date | null>(null);
  const [simulationCount, setSimulationCount] = useState(0);
  const [feedbackStatus, setFeedbackStatus] = useState<'none' | 'positive' | 'negative' | 'submitting'>('none');
  const [lastSimulationTimestamp, setLastSimulationTimestamp] = useState<string | null>(null);

  // 감독모드 상태
  const [teamInstruction, setTeamInstruction] = useState<TeamInstruction>(DEFAULT_INSTRUCTION);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [highlights, setHighlights] = useState<HighlightEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [ballOwnerTeam, setBallOwnerTeam] = useState<string | null>(null);

  // 시뮬레이션 시작 시 하이라이트 초기화
  useEffect(() => {
    if (simulationResult) {
      setHighlights([]);
      setCurrentStep(0);
    }
  }, [simulationResult]);

  // 백엔드 연결 상태 확인
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await axios.get(`${API_BASE_URL}/`);
        setBackendStatus('online');
      } catch {
        setBackendStatus('offline');
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = useCallback((field: keyof PlayerInput, value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    setPlayerInput((prev) => ({ ...prev, [field]: clampedValue }));
  }, []);

  const handleRecommend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<RecommendResponse>(
        `${API_BASE_URL}/recommend`,
        { player_input: playerInput }
      );
      setRecommendation(response.data);
      setLastApiCall(new Date());
      setBackendStatus('online');
    } catch (err: any) {
      setError(err.response?.data?.detail || '추천 요청 실패');
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [playerInput]);

  const handleSimulate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<SimulateResponse>(
        `${API_BASE_URL}/simulate`,
        { player_input: playerInput }
      );
      setSimulationResult(response.data);
      setSimulationCount((prev) => prev + 1);
      setLastApiCall(new Date());
      setBackendStatus('online');
      setFeedbackStatus('none');
      setLastSimulationTimestamp(new Date().toISOString());
    } catch (err: any) {
      setError(err.response?.data?.detail || '시뮬레이션 실행 실패');
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [playerInput]);

  const handleFeedback = useCallback(async (isPositive: boolean) => {
    if (!simulationResult || !lastSimulationTimestamp || feedbackStatus !== 'none') {
      return;
    }

    setFeedbackStatus('submitting');
    try {
      await axios.post(`${API_BASE_URL}/feedback`, {
        timestamp: lastSimulationTimestamp,
        feedback: isPositive ? 'positive' : 'negative',
        player_input: playerInput,
        used_action: simulationResult.used_action,
        final_score: simulationResult.final_score,
      });
      setFeedbackStatus(isPositive ? 'positive' : 'negative');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || '알 수 없는 오류';
      setFeedbackStatus('none');
      alert(`피드백 전송에 실패했습니다.\n\n오류: ${errorMessage}\n\n다시 시도해주세요.`);
    }
  }, [simulationResult, lastSimulationTimestamp, feedbackStatus, playerInput]);

  const handleHighlight = useCallback((highlight: HighlightEvent) => {
    setHighlights((prev) => [...prev, highlight].slice(-20));
  }, []);

  const containerStyle = useMemo(() => ({
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto' as const,
  }), []);

  const simulationContainerStyle = useMemo(() => ({
    position: 'relative' as const,
    minHeight: '100vh',
    paddingBottom: '400px',
  }), []);

  return (
    <div style={containerStyle}>
      <Header backendStatus={backendStatus} />

      {!simulationResult && (
        <PlayerInputForm
          playerInput={playerInput}
          onInputChange={handleInputChange}
          onRecommend={handleRecommend}
          onSimulate={handleSimulate}
          loading={loading}
          hasSimulationResult={!!simulationResult}
        />
      )}

      <ErrorMessage error={error || ''} />

      {recommendation && (
        <div style={{ marginBottom: '30px' }}>
          <TacticCard
            action={recommendation.action}
            confidence={recommendation.confidence}
            reason={recommendation.reason}
          />
        </div>
      )}

      {simulationResult && (
        <div style={simulationContainerStyle}>
          <HudBar
            score={simulationResult.final_score}
            currentStep={currentStep}
            totalSteps={simulationResult.events.length}
            instruction={teamInstruction}
            ballOwnerTeam={ballOwnerTeam}
          />

          <div style={{ marginTop: '60px', marginBottom: '20px' }}>
            <SimulationViewer
              events={simulationResult.events}
              teamInstruction={teamInstruction}
              playbackSpeed={playbackSpeed}
              onStepChange={setCurrentStep}
              onBallOwnerChange={setBallOwnerTeam}
              onHighlight={handleHighlight}
            />
          </div>

          <CoachPanel
            instruction={teamInstruction}
            onInstructionChange={setTeamInstruction}
            onSpeedChange={setPlaybackSpeed}
            currentSpeed={playbackSpeed}
            highlights={highlights}
          />

          <FeedbackButtons
            feedbackStatus={feedbackStatus}
            onFeedback={handleFeedback}
          />
        </div>
      )}

      <DebugInfo simulationCount={simulationCount} lastApiCall={lastApiCall} />
    </div>
  );
}
