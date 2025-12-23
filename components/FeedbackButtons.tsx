import React from 'react';

interface FeedbackButtonsProps {
  feedbackStatus: 'none' | 'positive' | 'negative' | 'submitting';
  onFeedback: (isPositive: boolean) => void;
}

const BUTTON_STYLES = {
  base: {
    padding: '12px 32px',
    fontSize: '20px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
  },
  positive: {
    backgroundColor: '#28a745',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  },
  positiveActive: {
    backgroundColor: '#28a745',
    boxShadow: '0 0 20px rgba(40, 167, 69, 0.6)',
  },
  negative: {
    backgroundColor: '#dc3545',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  },
  negativeActive: {
    backgroundColor: '#dc3545',
    boxShadow: '0 0 20px rgba(220, 53, 69, 0.6)',
  },
  disabled: {
    backgroundColor: '#666',
    cursor: 'not-allowed',
  },
};

const getButtonText = (status: FeedbackButtonsProps['feedbackStatus'], isPositive: boolean) => {
  if (status === 'submitting') return '⏳';
  if (isPositive) {
    return status === 'positive' ? '✓ 좋아요!' : '👍 좋아요';
  }
  return status === 'negative' ? '✓ 별로예요' : '👎 별로예요';
};

export default function FeedbackButtons({ feedbackStatus, onFeedback }: FeedbackButtonsProps) {
  const isDisabled = feedbackStatus !== 'none';

  return (
    <div style={{
      marginTop: '30px',
      padding: '24px',
      backgroundColor: 'rgba(26, 26, 46, 0.95)',
      borderRadius: '12px',
      border: '2px solid #0070f3',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '16px',
      }}>
        이 시뮬레이션 결과가 만족스러우신가요?
      </div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <button
          onClick={() => onFeedback(true)}
          disabled={isDisabled}
          style={{
            ...BUTTON_STYLES.base,
            ...(isDisabled ? BUTTON_STYLES.disabled : feedbackStatus === 'positive' ? BUTTON_STYLES.positiveActive : BUTTON_STYLES.positive),
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: feedbackStatus === 'none' || feedbackStatus === 'positive' ? 1 : 0.5,
          }}
        >
          {getButtonText(feedbackStatus, true)}
        </button>
        <button
          onClick={() => onFeedback(false)}
          disabled={isDisabled}
          style={{
            ...BUTTON_STYLES.base,
            ...(isDisabled ? BUTTON_STYLES.disabled : feedbackStatus === 'negative' ? BUTTON_STYLES.negativeActive : BUTTON_STYLES.negative),
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: feedbackStatus === 'none' || feedbackStatus === 'negative' ? 1 : 0.5,
          }}
        >
          {getButtonText(feedbackStatus, false)}
        </button>
      </div>
      {feedbackStatus !== 'none' && feedbackStatus !== 'submitting' && (
        <div style={{
          marginTop: '12px',
          color: '#00d4ff',
          fontSize: '14px',
          fontWeight: 'bold',
        }}>
          ✓ 피드백이 저장되었습니다. 감사합니다!
        </div>
      )}
    </div>
  );
}
