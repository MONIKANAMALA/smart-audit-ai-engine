import React, { useState } from 'react';

const STATUS_BADGES = {
  PENDING: { className: 'badge-pending', label: '⏳ Pending' },
  PROCESSING: { className: 'badge-processing', label: '⚙️ Processing' },
  COMPLETED: { className: 'badge-completed', label: '✅ Completed' },
  FAILED: { className: 'badge-failed', label: '❌ Failed' }
};

const RISK_BADGES = {
  HIGH: { className: 'risk-high', label: 'HIGH' },
  MEDIUM: { className: 'risk-medium', label: 'MEDIUM' },
  LOW: { className: 'risk-low', label: 'LOW' }
};

function AuditTable({ entries, onEdit, onEditNotes, onFindSimilar, editingNotes, onSaveNotes, onCancelNotes }) {
  const [expandedId, setExpandedId] = useState(null);
  const [notesText, setNotesText] = useState('');

  const startEditNotes = (entry) => {
    setNotesText(entry.aiMetadata?.auditorNotes || '');
    onEditNotes(entry);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="table-card">
      <div className="table-header">
        <h2>📋 Audit Entries</h2>
        <span className="entry-count">{entries.length} entries</span>
      </div>
      <div className="table-responsive">
        <table className="audit-table" id="audit-table">
          <thead>
            <tr>
              <th>Evidence ID</th>
              <th>Entity</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const status = entry.aiMetadata?.status || 'PENDING';
              const statusBadge = STATUS_BADGES[status] || STATUS_BADGES.PENDING;
              const riskLevel = entry.aiMetadata?.riskLevel;
              const riskBadge = riskLevel ? RISK_BADGES[riskLevel] : null;
              const isExpanded = expandedId === entry._id;
              const isEditingNotes = editingNotes && editingNotes._id === entry._id;

              return (
                <React.Fragment key={entry._id}>
                  <tr className={isExpanded ? 'row-expanded' : ''} id={`entry-${entry.evidenceId}`}>
                    <td className="cell-evidence">
                      <button className="evidence-link" onClick={() => setExpandedId(isExpanded ? null : entry._id)}>
                        {entry.evidenceId}
                      </button>
                    </td>
                    <td>{entry.entityName}</td>
                    <td className="cell-desc">{entry.description?.substring(0, 60)}{entry.description?.length > 60 ? '...' : ''}</td>
                    <td className="cell-amount">{formatCurrency(entry.monetaryImpact)}</td>
                    <td><span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span></td>
                    <td>
                      {riskBadge
                        ? <span className={`badge ${riskBadge.className}`}>{riskBadge.label}</span>
                        : <span className="badge badge-na">—</span>
                      }
                    </td>
                    <td className="cell-score">
                      {entry.aiMetadata?.riskScore !== null && entry.aiMetadata?.riskScore !== undefined
                        ? entry.aiMetadata.riskScore
                        : '—'}
                    </td>
                    <td className="cell-actions">
                      <button className="btn-icon" onClick={() => onEdit(entry)} title="Edit entry" id={`edit-${entry.evidenceId}`}>✏️</button>
                      <button className="btn-icon" onClick={() => startEditNotes(entry)} title="Edit notes" id={`notes-${entry.evidenceId}`}>📝</button>
                      {status === 'COMPLETED' && (
                        <button className="btn-icon btn-similar" onClick={() => onFindSimilar(entry._id)} title="Find similar" id={`similar-${entry.evidenceId}`}>🔍</button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan="8">
                        <div className="expanded-content">
                          <div className="expanded-grid">
                            <div className="expanded-section">
                              <h4>📄 Details</h4>
                              <p><strong>Event Type:</strong> {entry.eventType}</p>
                              <p><strong>Control ID:</strong> {entry.controlId}</p>
                              <p><strong>Actor:</strong> {entry.actorUserId}</p>
                              <p><strong>Tenant:</strong> {entry.tenantId}</p>
                              <p><strong>Description:</strong> {entry.description}</p>
                            </div>
                            <div className="expanded-section">
                              <h4>🤖 AI Analysis</h4>
                              {entry.aiMetadata?.aiSummary ? (
                                <>
                                  <p><strong>Summary:</strong> {entry.aiMetadata.aiSummary}</p>
                                  {entry.aiMetadata.anomalyFlags?.length > 0 && (
                                    <div className="flags-list">
                                      <strong>Flags:</strong>
                                      {entry.aiMetadata.anomalyFlags.map((f, i) => (
                                        <span key={i} className="flag-tag">{f}</span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-muted">AI analysis not yet available.</p>
                              )}
                            </div>
                            <div className="expanded-section">
                              <h4>📝 Auditor Notes</h4>
                              <p>{entry.aiMetadata?.auditorNotes || <em className="text-muted">No notes added.</em>}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {isEditingNotes && (
                    <tr className="notes-edit-row">
                      <td colSpan="8">
                        <div className="notes-editor">
                          <h4>📝 Edit Auditor Notes — {entry.evidenceId}</h4>
                          <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            rows="3"
                            placeholder="Enter auditor notes..."
                            className="notes-textarea"
                            id="notes-textarea"
                          />
                          <div className="notes-actions">
                            <button className="btn btn-ghost btn-sm" onClick={onCancelNotes}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={() => onSaveNotes(entry._id, notesText)} id="save-notes">Save Notes</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditTable;
