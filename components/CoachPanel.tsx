/**
 * 감독 패널 컴포넌트
 * FC 온라인 모바일 감독모드 스타일
 */
import React, { useState } from 'react';
import { TeamInstruction, TACTIC_PRESETS } from './TeamInstruction';

interface CoachPanelProps {
  instruction: TeamInstruction;
  onInstructionChange: (instruction: TeamInstruction) => void;
  onSpeedChange: (speed: number) => void;
  currentSpeed: number;
  highlights: HighlightEvent[];
}

export interface HighlightEvent {
  id: string;
  time: number;
  message: string;
  type: 'goal' | 'tackle' | 'pass' | 'miss' | 'info';
}

type TabType = 'tactics' | 'presets' | 'highlights' | 'speed';

export default function CoachPanel({
  instruction,
  onInstructionChange,
  onSpeedChange,
  currentSpeed,
  highlights,
}: CoachPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tactics');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showTacticToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1000);
  };

  const handleInstructionChange = (key: keyof TeamInstruction, value: any) => {
    const newInstruction = { ...instruction, [key]: value };
    onInstructionChange(newInstruction);
    showTacticToast('전술 적용됨');
  };

  const handlePreset = (presetName: string) => {
    const preset = TACTIC_PRESETS[presetName];
    if (preset) {
      onInstructionChange(preset);
      showTacticToast(`${presetName} 전술 적용`);
    }
  };

  const getPresetName = (key: string): string => {
    const names: { [key: string]: string } = {
      possession: '점유',
      counter: '역습',
      allIn: '올인',
      parkTheBus: '잠그기',
      gegenpress: '게겐프레싱',
      tikiTaka: '티키타카',
    };
    return names[key] || key;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a1a2e',
        borderTop: '2px solid #00ffff',
        borderRadius: isExpanded ? '20px 20px 0 0' : '0',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        transition: 'transform 0.3s ease',
        transform: isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 60px))',
      }}
    >
      {/* 접기/펼치기 버튼 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid #333' : 'none',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#666',
            borderRadius: '2px',
          }}
        />
      </div>

      {isExpanded && (
        <>
          {/* 탭 버튼 */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #333',
              backgroundColor: '#0f0f1e',
            }}
          >
            {(['tactics', 'presets', 'highlights', 'speed'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  backgroundColor: activeTab === tab ? '#1a1a2e' : 'transparent',
                  color: activeTab === tab ? '#00ffff' : '#888',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #00ffff' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                }}
              >
                {tab === 'tactics' && '전술'}
                {tab === 'presets' && '프리셋'}
                {tab === 'highlights' && '하이라이트'}
                {tab === 'speed' && '속도'}
              </button>
            ))}
          </div>

          {/* 탭 내용 */}
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '16px',
            }}
          >
            {activeTab === 'tactics' && (
              <TacticsTab
                instruction={instruction}
                onChange={handleInstructionChange}
              />
            )}

            {activeTab === 'presets' && (
              <PresetsTab onPreset={handlePreset} getPresetName={getPresetName} />
            )}

            {activeTab === 'highlights' && (
              <HighlightsTab highlights={highlights} />
            )}

            {activeTab === 'speed' && (
              <SpeedTab currentSpeed={currentSpeed} onChange={onSpeedChange} />
            )}
          </div>
        </>
      )}

      {/* 토스트 메시지 */}
      {showToast && (
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#00ffff',
            color: '#000',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 10px rgba(0, 255, 255, 0.5)',
            animation: 'fadeInOut 1s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          50% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// 전술 탭
function TacticsTab({
  instruction,
  onChange,
}: {
  instruction: TeamInstruction;
  onChange: (key: keyof TeamInstruction, value: any) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <TacticToggle
        label="공격 성향"
        value={instruction.attackStyle}
        options={[
          { value: 'defensive', label: '안정' },
          { value: 'balanced', label: '균형' },
          { value: 'aggressive', label: '공격' },
        ]}
        onChange={(v) => onChange('attackStyle', v)}
      />

      <TacticToggle
        label="압박 강도"
        value={instruction.pressingIntensity}
        options={[
          { value: 'low', label: '낮' },
          { value: 'medium', label: '중' },
          { value: 'high', label: '높' },
        ]}
        onChange={(v) => onChange('pressingIntensity', v)}
      />

      <TacticToggle
        label="패스 성향"
        value={instruction.passStyle}
        options={[
          { value: 'short', label: '짧게' },
          { value: 'balanced', label: '균형' },
          { value: 'direct', label: '전환' },
        ]}
        onChange={(v) => onChange('passStyle', v)}
      />

      <TacticToggle
        label="수비 라인"
        value={instruction.defenseLine}
        options={[
          { value: 'low', label: '낮' },
          { value: 'medium', label: '보통' },
          { value: 'high', label: '높' },
        ]}
        onChange={(v) => onChange('defenseLine', v)}
      />
    </div>
  );
}

// 토글 컴포넌트
function TacticToggle({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          backgroundColor: '#0f0f1e',
          borderRadius: '8px',
          padding: '4px',
          gap: '4px',
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '8px 4px',
              backgroundColor: value === opt.value ? '#00ffff' : 'transparent',
              color: value === opt.value ? '#000' : '#888',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: value === opt.value ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// 프리셋 탭
function PresetsTab({
  onPreset,
  getPresetName,
}: {
  onPreset: (name: string) => void;
  getPresetName: (name: string) => string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}
    >
      {Object.keys(TACTIC_PRESETS).map((key) => (
        <button
          key={key}
          onClick={() => onPreset(key)}
          style={{
            padding: '16px',
            backgroundColor: '#0f0f1e',
            border: '2px solid #333',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00ffff';
            e.currentTarget.style.backgroundColor = '#1a1a2e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.backgroundColor = '#0f0f1e';
          }}
        >
          {getPresetName(key)}
        </button>
      ))}
    </div>
  );
}

// 하이라이트 탭
function HighlightsTab({ highlights }: { highlights: HighlightEvent[] }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'goal': return '#00ff00';
      case 'tackle': return '#ffaa00';
      case 'pass': return '#00aaff';
      case 'miss': return '#ff4444';
      default: return '#888';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {highlights.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          이벤트가 없습니다
        </div>
      ) : (
        highlights.slice(-20).reverse().map((event) => (
          <div
            key={event.id}
            style={{
              padding: '12px',
              backgroundColor: '#0f0f1e',
              borderLeft: `4px solid ${getTypeColor(event.type)}`,
              borderRadius: '8px',
              fontSize: '12px',
              color: '#ddd',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: getTypeColor(event.type), fontWeight: 'bold' }}>
                {event.type.toUpperCase()}
              </span>
              <span style={{ color: '#666', fontSize: '10px' }}>
                {event.time}초
              </span>
            </div>
            <div>{event.message}</div>
          </div>
        ))
      )}
    </div>
  );
}

// 속도 탭
function SpeedTab({
  currentSpeed,
  onChange,
}: {
  currentSpeed: number;
  onChange: (speed: number) => void;
}) {
  const speeds = [1, 2, 4];

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
      }}
    >
      {speeds.map((speed) => (
        <button
          key={speed}
          onClick={() => onChange(speed)}
          style={{
            flex: 1,
            padding: '16px',
            backgroundColor: currentSpeed === speed ? '#00ffff' : '#0f0f1e',
            color: currentSpeed === speed ? '#000' : '#888',
            border: `2px solid ${currentSpeed === speed ? '#00ffff' : '#333'}`,
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          x{speed}
        </button>
      ))}
    </div>
  );
}
