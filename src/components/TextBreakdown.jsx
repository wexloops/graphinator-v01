import React from 'react';

export default function TextBreakdown({ breakdown }) {
  if (!breakdown) {
    return (
      <div className="text-panel">
        <div className="panel-header">
          <h2>System Breakdown</h2>
        </div>
        <div className="panel-content">
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Enter a prompt to generate a flowchart and see the breakdown here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-panel">
      <div className="panel-header">
        <h2>System Breakdown</h2>
      </div>
      <div className="panel-content">
        {breakdown.overview && (
          <div className="breakdown-section">
            <h3>Overview</h3>
            <p>{breakdown.overview}</p>
          </div>
        )}

        {breakdown.steps && breakdown.steps.length > 0 && (
          <div className="breakdown-section">
            <h3>Steps</h3>
            <ul>
              {breakdown.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {breakdown.key_decisions && breakdown.key_decisions.length > 0 && (
          <div className="breakdown-section">
            <h3>Key Decisions</h3>
            <ul>
              {breakdown.key_decisions.map((decision, index) => (
                <li key={index}>{decision}</li>
              ))}
            </ul>
          </div>
        )}

        {breakdown.outcomes && breakdown.outcomes.length > 0 && (
          <div className="breakdown-section">
            <h3>Outcomes</h3>
            <ul>
              {breakdown.outcomes.map((outcome, index) => (
                <li key={index}>{outcome}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
