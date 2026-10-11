import React, { useState, useEffect } from 'react';

const EVENT_TYPES = ['TRANSACTION', 'ADJUSTMENT', 'OVERRIDE', 'REVIEW', 'APPROVAL'];

function AuditForm({ entry, onSubmit, onCancel, submitting }) {
  const isEditing = Boolean(entry);

  const [formData, setFormData] = useState({
    eventType: 'TRANSACTION',
    evidenceId: '',
    entityName: '',
    description: '',
    monetaryImpact: '',
    controlId: '',
    actorUserId: '',
    tenantId: '',
    auditorNotes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (entry) {
      setFormData({
        eventType: entry.eventType || 'TRANSACTION',
        evidenceId: entry.evidenceId || '',
        entityName: entry.entityName || '',
        description: entry.description || '',
        monetaryImpact: entry.monetaryImpact?.toString() || '',
        controlId: entry.controlId || '',
        actorUserId: entry.actorUserId || '',
        tenantId: entry.tenantId || '',
        auditorNotes: entry.aiMetadata?.auditorNotes || ''
      });
    }
  }, [entry]);

  const validate = () => {
    const errs = {};
    if (!formData.eventType) errs.eventType = 'Required';
    if (!isEditing && !formData.evidenceId.trim()) errs.evidenceId = 'Required';
    if (!formData.entityName.trim()) errs.entityName = 'Required';
    if (!formData.description.trim()) errs.description = 'Required';
    if (!formData.monetaryImpact || isNaN(formData.monetaryImpact) || Number(formData.monetaryImpact) < 0) {
      errs.monetaryImpact = 'Must be a non-negative number';
    }
    if (!formData.controlId.trim()) errs.controlId = 'Required';
    if (!isEditing && !formData.actorUserId.trim()) errs.actorUserId = 'Required';
    if (!isEditing && !formData.tenantId.trim()) errs.tenantId = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    const data = { ...formData, monetaryImpact: Number(formData.monetaryImpact) };
    if (isEditing) {
      // Only send changed fields
      const changed = {};
      if (data.description !== entry.description) changed.description = data.description;
      if (data.monetaryImpact !== entry.monetaryImpact) changed.monetaryImpact = data.monetaryImpact;
      if (data.controlId !== entry.controlId) changed.controlId = data.controlId;
      if (data.entityName !== entry.entityName) changed.entityName = data.entityName;
      if (data.eventType !== entry.eventType) changed.eventType = data.eventType;
      if (data.auditorNotes !== (entry.aiMetadata?.auditorNotes || '')) changed.auditorNotes = data.auditorNotes;
      onSubmit(changed);
    } else {
      onSubmit(data);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="form-card">
      <h2 className="form-title">{isEditing ? '✏️ Edit Audit Entry' : '📝 New Audit Entry'}</h2>
      <form onSubmit={handleSubmit} className="audit-form" id="audit-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="eventType">Event Type</label>
            <select id="eventType" value={formData.eventType} onChange={(e) => handleChange('eventType', e.target.value)}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.eventType && <span className="field-error">{errors.eventType}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="evidenceId">Evidence ID</label>
            <input id="evidenceId" type="text" value={formData.evidenceId}
              onChange={(e) => handleChange('evidenceId', e.target.value)}
              disabled={isEditing} placeholder="e.g. AUD-2024-006" />
            {errors.evidenceId && <span className="field-error">{errors.evidenceId}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="entityName">Entity Name</label>
            <input id="entityName" type="text" value={formData.entityName}
              onChange={(e) => handleChange('entityName', e.target.value)}
              placeholder="e.g. Acme Corp" />
            {errors.entityName && <span className="field-error">{errors.entityName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="monetaryImpact">Monetary Impact ($)</label>
            <input id="monetaryImpact" type="number" min="0" step="0.01" value={formData.monetaryImpact}
              onChange={(e) => handleChange('monetaryImpact', e.target.value)}
              placeholder="e.g. 50000" />
            {errors.monetaryImpact && <span className="field-error">{errors.monetaryImpact}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="controlId">Control ID</label>
            <input id="controlId" type="text" value={formData.controlId}
              onChange={(e) => handleChange('controlId', e.target.value)}
              placeholder="e.g. CTRL-FIN-001" />
            {errors.controlId && <span className="field-error">{errors.controlId}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="actorUserId">Actor User ID</label>
            <input id="actorUserId" type="text" value={formData.actorUserId}
              onChange={(e) => handleChange('actorUserId', e.target.value)}
              disabled={isEditing} placeholder="e.g. user-jsmith" />
            {errors.actorUserId && <span className="field-error">{errors.actorUserId}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="tenantId">Tenant ID</label>
            <input id="tenantId" type="text" value={formData.tenantId}
              onChange={(e) => handleChange('tenantId', e.target.value)}
              disabled={isEditing} placeholder="e.g. tenant-001" />
            {errors.tenantId && <span className="field-error">{errors.tenantId}</span>}
          </div>
        </div>

        <div className="form-group form-group-full">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows="3" value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the audit finding..." />
          {errors.description && <span className="field-error">{errors.description}</span>}
        </div>

        <div className="form-group form-group-full">
          <label htmlFor="auditorNotes">Auditor Notes (optional)</label>
          <textarea id="auditorNotes" rows="2" value={formData.auditorNotes}
            onChange={(e) => handleChange('auditorNotes', e.target.value)}
            placeholder="Add any notes for the auditor..." />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting} id="submit-entry">
            {submitting ? 'Saving...' : (isEditing ? 'Update Entry' : 'Create Entry')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AuditForm;
