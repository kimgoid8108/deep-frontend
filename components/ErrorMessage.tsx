import React from 'react';

interface ErrorMessageProps {
  error: string;
}

export default function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div style={{
      padding: '15px',
      backgroundColor: '#fee',
      color: '#c00',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #fcc',
    }}>
      <strong>오류:</strong> {error}
    </div>
  );
}
