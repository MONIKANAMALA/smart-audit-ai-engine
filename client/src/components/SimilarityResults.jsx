import React from 'react';

function SimilarityResults({ results, loading, onClose }) {
  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Finding similar entries...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getSimilarityColor = (score) => {
    if (score >= 90) return 'similarity-high';
    if (score >= 70) return 'similarity-medium';
    return 'similarity-low';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-similarity" onClick={(e) => e.stopPropagation()} id="similarity-modal">
        <div className="modal-header">
          <h2>🔍 Similar Audit Entries</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="modal-subtitle">Top matches for <strong>{results.source}</strong> based on cosine similarity of 8-dimensional semantic vectors</p>

        {results.results.length === 0 ? (
          <div className="empty-state">
            <p>No similar completed entries found in the database.</p>
          </div>
        ) : (
          <div className="similarity-list">
            {results.results.map((match, index) => (
              <div key={match._id} className="similarity-card">
                <div className="similarity-rank">#{index + 1}</div>
                <div className="similarity-info">
                  <div className="similarity-header">
                    <h3>{match.evidenceId}</h3>
                    <span className={`similarity-score ${getSimilarityColor(match.similarity)}`}>
                      {match.similarity}% match
                    </span>
                  </div>
                  <p className="similarity-entity">{match.entityName}</p>
                  <p className="similarity-desc">{match.description}</p>
                  <div className="similarity-meta">
                    <span className="similarity-amount">{formatCurrency(match.monetaryImpact)}</span>
                    {match.riskLevel && (
                      <span className={`badge risk-${match.riskLevel.toLowerCase()}`}>{match.riskLevel}</span>
                    )}
                    {match.riskScore !== null && (
                      <span className="similarity-risk-score">Score: {match.riskScore}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SimilarityResults;
