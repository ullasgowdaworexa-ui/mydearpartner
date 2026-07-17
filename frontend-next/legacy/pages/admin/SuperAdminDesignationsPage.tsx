'use client';

import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import {
  getSuperAdminDesignations,
  createSuperAdminDesignation,
  updateSuperAdminDesignation,
  deleteSuperAdminDesignation,
  getSuperAdminDepartments,
  type Designation,
  type Department
} from '../../services/adminService';

export default function SuperAdminDesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  
  // Filter state
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Form fields
  const [departmentId, setDepartmentId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [deptsData, desigsData] = await Promise.all([
        getSuperAdminDepartments(),
        getSuperAdminDesignations({ department: selectedDeptFilter || undefined }),
      ]);
      setDepartments(deptsData.filter(d => d.is_active));
      setDesignations(desigsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load designations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDeptFilter]);

  const openAdd = () => {
    setEditing(null);
    setDepartmentId(departments[0]?.id || '');
    setName('');
    setCode('');
    setDescription('');
    setIsActive(true);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (desig: Designation) => {
    setEditing(desig);
    setDepartmentId(desig.department);
    setName(desig.name);
    setCode(desig.code);
    setDescription(desig.description);
    setIsActive(desig.is_active);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !departmentId) {
      setError('Department, Name, and Code are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const payload = {
        department: departmentId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        is_active: isActive,
      };

      if (editing) {
        await updateSuperAdminDesignation(editing.id, payload);
      } else {
        await createSuperAdminDesignation(payload);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (desig: Designation) => {
    if (!window.confirm(`Are you sure you want to delete designation "${desig.name}"?`)) {
      return;
    }
    try {
      setError('');
      await deleteSuperAdminDesignation(desig.id);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete designation. It might be assigned to active employees.');
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BriefcaseBusiness style={{ color: '#6366f1' }} /> Designations
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#9ca3af' }}>Manage operational titles and mapping levels for routing tickets/tasks.</p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#4f46e5')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#6366f1')}
        >
          <Plus size={18} /> Add Designation
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{ background: '#1f2937', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid #374151' }}>
        <span style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>Filter by Department:</span>
        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          style={{ padding: '0.5rem 1rem', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name} ({dept.code})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" style={{ margin: '0 auto 1rem' }} />
          Loading designations...
        </div>
      ) : designations.length === 0 ? (
        <div style={{ background: '#1f2937', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#9ca3af', border: '1px solid #374151' }}>
          No designations found.
        </div>
      ) : (
        <div style={{ background: '#1f2937', borderRadius: '12px', overflow: 'hidden', border: '1px solid #374151' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#111827', borderBottom: '1px solid #374151', color: '#9ca3af', fontSize: '0.875rem' }}>
                <th style={{ padding: '1rem' }}>Code</th>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Department</th>
                <th style={{ padding: '1rem' }}>Description</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {designations.map((desig) => (
                <tr key={desig.id} style={{ borderBottom: '1px solid #374151', color: '#e5e7eb', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>
                    <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                      {desig.code}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{desig.name}</td>
                  <td style={{ padding: '1rem', color: '#a5b4fc' }}>{desig.department_details?.name || 'â€”'}</td>
                  <td style={{ padding: '1rem', color: '#9ca3af' }}>{desig.description || 'â€”'}</td>
                  <td style={{ padding: '1rem' }}>
                    {desig.is_active ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#34d399', fontSize: '0.875rem' }}>
                        <CheckCircle2 size={16} /> Active
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#f87171', fontSize: '0.875rem' }}>
                        <XCircle size={16} /> Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => openEdit(desig)}
                      style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', marginRight: '1rem', padding: '0.25rem' }}
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(desig)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="admin-dark-modal-backdrop">
          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ margin: '0 0 1.5rem', color: '#f3f4f6', fontSize: '1.25rem', fontWeight: '600' }}>
              {editing ? 'Edit Designation' : 'Add New Designation'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
                  required
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>Code (e.g. SR_VERIFIER)</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!editing}
                  placeholder="DESIGNATION_CODE"
                  style={{ width: '100%', padding: '0.75rem', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Senior Verifier"
                  style={{ width: '100%', padding: '0.75rem', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter designation mapping..."
                  style={{ width: '100%', padding: '0.75rem', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="isActive" style={{ color: '#e5e7eb', fontSize: '0.875rem', cursor: 'pointer' }}>Active Designation</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid #4b5563', color: '#d1d5db', padding: '0.625rem 1.25rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
