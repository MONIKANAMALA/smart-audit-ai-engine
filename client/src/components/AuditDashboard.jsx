import React from 'react';
import AuditForm from './AuditForm.jsx';
import AuditTable from './AuditTable.jsx';
import SimilarityResults from './SimilarityResults.jsx';

const API_BASE = '/api/audit-entries';

class AuditDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      entries: [],
      loading: true,
      error: null,
      successMessage: null,
      showForm: false,
      editingEntry: null,
      editingNotes: null,
      similarResults: null,
      similarLoading: false,
      submitting: false,
      searchQuery: '',
      statusFilter: ''
    };
    this.pollTimer = null;
    this.messageTimer = null;
  }

  componentDidMount() {
    this.fetchEntries();
    this.pollTimer = setInterval(() => this.fetchEntries(true), 3000);
  }

  componentWillUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.messageTimer) clearTimeout(this.messageTimer);
  }

  showSuccess(message) {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.setState({ successMessage: message });
    this.messageTimer = setTimeout(() => this.setState({ successMessage: null }), 4000);
  }

  async fetchEntries(silent = false) {
    try {
      if (!silent) this.setState({ loading: true });
      const params = new URLSearchParams();
      if (this.state.statusFilter) params.append('status', this.state.statusFilter);
      if (this.state.searchQuery) params.append('search', this.state.searchQuery);
      const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch entries');
      const entries = await res.json();
      this.setState({ entries, loading: false, error: null });
    } catch (err) {
      if (!silent) this.setState({ error: err.message, loading: false });
    }
  }

  async handleCreate(formData) {
    this.setState({ submitting: true });
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create entry');
      this.setState({ showForm: false });
      this.showSuccess(`Entry ${data.evidenceId} created successfully!`);
      await this.fetchEntries();
    } catch (err) {
      this.setState({ error: err.message });
    } finally {
      this.setState({ submitting: false });
    }
  }

  async handleUpdate(id, updateData) {
    this.setState({ submitting: true });
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update entry');
      this.setState({ editingEntry: null });
      this.showSuccess('Entry updated successfully!');
      await this.fetchEntries();
    } catch (err) {
      this.setState({ error: err.message });
    } finally {
      this.setState({ submitting: false });
    }
  }

  async handleNotesUpdate(id, notes) {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditorNotes: notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update notes');
      this.setState({ editingNotes: null });
      this.showSuccess('Auditor notes updated!');
      await this.fetchEntries();
    } catch (err) {
      this.setState({ error: err.message });
    }
  }

  async handleFindSimilar(id) {
    this.setState({ similarLoading: true, similarResults: null });
    try {
      const res = await fetch(`${API_BASE}/${id}/similar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to find similar entries');
      this.setState({ similarResults: data, similarLoading: false });
    } catch (err) {
      this.setState({ error: err.message, similarLoading: false });
    }
  }

  getStats() {
    const entries = this.state.entries;
    return {
      total: entries.length,
      pending: entries.filter(e => e.aiMetadata?.status === 'PENDING' || e.aiMetadata?.status === 'PROCESSING').length,
      completed: entries.filter(e => e.aiMetadata?.status === 'COMPLETED').length,
      highRisk: entries.filter(e => e.aiMetadata?.riskLevel === 'HIGH').length
    };
  }

  render() {
    const { entries, loading, error, successMessage, showForm, editingEntry,
      editingNotes, similarResults, similarLoading, submitting, searchQuery, statusFilter } = this.state;
    const stats = this.getStats();

    return (
      <div className="dashboard">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-title-group">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="url(#grad1)"/>
                  <path d="M16 8L22 12V20L16 24L10 20V12L16 8Z" stroke="white" strokeWidth="1.5" fill="none"/>
                  <circle cx="16" cy="16" r="3" fill="white" opacity="0.9"/>
                  <defs><linearGradient id="grad1" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs>
                </svg>
              </div>
              <div>
                <h1>SmartAudit</h1>
                <p className="subtitle">AI-Enriched Continuous Audit Pipeline</p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-secondary"
                onClick={() => this.fetchEntries()}
                title="Refresh entries"
              >
                ↻ Refresh
              </button>
              <button
                className="btn btn-primary"
                onClick={() => this.setState({ showForm: !showForm, editingEntry: null })}
              >
                {showForm ? '✕ Cancel' : '+ New Audit Entry'}
              </button>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          {/* Messages */}
          {error && (
            <div className="alert alert-error">
              <span>⚠ {error}</span>
              <button className="alert-close" onClick={() => this.setState({ error: null })}>✕</button>
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success">
              <span>✓ {successMessage}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-total">📊</div>
              <div className="stat-info">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Entries</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-pending">⏳</div>
              <div className="stat-info">
                <span className="stat-value">{stats.pending}</span>
                <span className="stat-label">Pending / Processing</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-completed">✅</div>
              <div className="stat-info">
                <span className="stat-value">{stats.completed}</span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
            <div className="stat-card stat-card-risk">
              <div className="stat-icon stat-icon-risk">🔴</div>
              <div className="stat-info">
                <span className="stat-value">{stats.highRisk}</span>
                <span className="stat-label">High Risk</span>
              </div>
            </div>
          </div>

          {/* Form */}
          {(showForm || editingEntry) && (
            <AuditForm
              entry={editingEntry}
              onSubmit={(data) => editingEntry
                ? this.handleUpdate(editingEntry._id, data)
                : this.handleCreate(data)
              }
              onCancel={() => this.setState({ showForm: false, editingEntry: null })}
              submitting={submitting}
            />
          )}

          {/* Search & Filter */}
          <div className="controls-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => this.setState({ searchQuery: e.target.value }, () => this.fetchEntries())}
                className="search-input"
                id="search-input"
              />
            </div>
            <div className="filter-box">
              <select
                value={statusFilter}
                onChange={(e) => this.setState({ statusFilter: e.target.value }, () => this.fetchEntries())}
                className="filter-select"
                id="status-filter"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading audit entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No audit entries found</h3>
              <p>Create your first audit entry to get started.</p>
            </div>
          ) : (
            <AuditTable
              entries={entries}
              onEdit={(entry) => this.setState({ editingEntry: entry, showForm: false })}
              onEditNotes={(entry) => this.setState({ editingNotes: entry })}
              onFindSimilar={(id) => this.handleFindSimilar(id)}
              editingNotes={editingNotes}
              onSaveNotes={(id, notes) => this.handleNotesUpdate(id, notes)}
              onCancelNotes={() => this.setState({ editingNotes: null })}
            />
          )}

          {/* Similarity Results */}
          {(similarResults || similarLoading) && (
            <SimilarityResults
              results={similarResults}
              loading={similarLoading}
              onClose={() => this.setState({ similarResults: null })}
            />
          )}
        </main>

        <footer className="dashboard-footer">
          <p>SmartAudit © 2024 — AI-Enriched Continuous Audit Pipeline</p>
        </footer>
      </div>
    );
  }
}

export default AuditDashboard;
