'use client';

import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from '@/lib/router-compat';
import { Headphones, Plus, ToggleLeft, ToggleRight, Key, Activity, Search } from 'lucide-react';
import {
  getAdminCustomerSupportList,
  createAdminCustomerSupport,
  updateAdminCustomerSupport,
  actionAdminCustomerSupport,
  getAdminCustomerSupportActivity,
  getSuperAdminDepartments,
  getSuperAdminDesignations,
  type AdminAccount,
  type Department,
  type Designation
} from '../../services/adminService';

const supportLevels = ['L1', 'L2', 'L3'];
const specializations = ['GENERAL', 'PREMIUM', 'TECHNICAL', 'BILLING'];

export default function AdminCustomerSupportPage() {
  const navigate = useNavigate();
  const isSuper = window.location.pathname.startsWith('/super-admin');
  const basePath = isSuper ? '/super-admin/customer-support' : '/admin/customer-support';

  const matchCreate = useMatch(`${basePath}/create`);
  const matchEdit = useMatch(`${basePath}/:id/edit`);
  const matchDetail = useMatch(`${basePath}/:id`);

  const [supportList, setSupportList] = useState<AdminAccount[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search/Filters
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  
  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [activityAccount, setActivityAccount] = useState<AdminAccount | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [resetAccount, setResetAccount] = useState<AdminAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [deptId, setDeptId] = useState('');
  const [desigId, setDesigId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [supportLevel, setSupportLevel] = useState('L1');
  const [specialization, setSpecialization] = useState('GENERAL');
  const [submitting, setSubmitting] = useState(false);

  const fetchSupport = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (levelFilter) params.support_level = levelFilter;
      
      const data = await getAdminCustomerSupportList(params);
      setSupportList(data.results);
    } catch (err: any) {
      setError(err.message || 'Failed to load support list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [deptsData, desigsData] = await Promise.all([
        getSuperAdminDepartments(),
        getSuperAdminDesignations(),
      ]);
      setDepartments(deptsData.filter(d => d.is_active));
      setDesignations(desigsData.filter(d => d.is_active));
    } catch (err) {
      console.error('Failed to load filter metadata', err);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  // Reset designation if incompatible with selected department
  useEffect(() => {
    if (deptId && desigId) {
      const isCompatible = designations.some(d => d.id === desigId && d.department === deptId);
      if (!isCompatible) {
        setDesigId('');
      }
    }
  }, [deptId, desigId, designations]);

  useEffect(() => {
    fetchSupport();
  }, [search, levelFilter]);

  const closeModal = () => {
    setModalOpen(false);
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(basePath);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setDeptId(departments[0]?.id || '');
    setDesigId('');
    setEmployeeCode('');
    setSupportLevel('L1');
    setSpecialization('GENERAL');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (acc: AdminAccount) => {
    setEditing(acc);
    setFullName(acc.full_name);
    setEmail(acc.email);
    setPhone(acc.phone || '');
    setPassword('');
    setDeptId(acc.department?.id || '');
    setDesigId(acc.designation?.id || '');
    setEmployeeCode(acc.employee_code || '');
    setSupportLevel(acc.support_level || 'L1');
    setSpecialization(acc.specialization || 'GENERAL');
    setError('');
    setModalOpen(true);
  };

  useEffect(() => {
    if (matchCreate) {
      openAdd();
    } else if (matchEdit) {
      const editId = matchEdit.params.id;
      const found = supportList.find(s => s.id === editId);
      if (found) {
        openEdit(found);
      } else if (editId) {
        getAdminCustomerSupportList().then(res => {
          const acc = res.results.find((s: any) => s.id === editId);
          if (acc) openEdit(acc);
        }).catch(err => console.error(err));
      }
    } else if (matchDetail) {
      const detailId = matchDetail.params.id;
      const found = supportList.find(s => s.id === detailId);
      if (found) {
        openEdit(found);
      }
    } else {
      setModalOpen(false);
    }
  }, [matchCreate, matchEdit, matchDetail, supportList.length, departments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      
      const payload: any = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: deptId || null,
        designation: desigId || null,
        employee_code: employeeCode.trim() || null,
        support_level: supportLevel,
        specialization: specialization,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      if (editing) {
        await updateAdminCustomerSupport(editing.id, payload);
      } else {
        if (!password.trim()) {
          setError('Password is required for new accounts.');
          return;
        }
        await createAdminCustomerSupport(payload);
      }
      closeModal();
      fetchSupport();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (acc: AdminAccount) => {
    try {
      setError('');
      const action = acc.is_active ? 'deactivate' : 'activate';
      await actionAdminCustomerSupport(acc.id, action);
      fetchSupport();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAccount || !newPassword.trim()) return;
    try {
      setError('');
      await actionAdminCustomerSupport(resetAccount.id, 'reset-password', {
        new_password: newPassword.trim(),
      });
      alert('Password updated successfully.');
      setResetAccount(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  const openActivity = async (acc: AdminAccount) => {
    setActivityAccount(acc);
    setLoadingLogs(true);
    setActivityLogs([]);
    try {
      const logs = await getAdminCustomerSupportActivity(acc.id);
      setActivityLogs(logs);
    } catch (err) {
      console.error('Failed to load activity logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Headphones style={{ color: '#6366f1' }} /> Customer Support Agents
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#9ca3af' }}>Manage customer support agents, check workloads, and audit logs.</p>
        </div>
        <button
          onClick={() => navigate(`${basePath}/create`)}
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
          <Plus size={18} /> Add Support Agent
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#1f2937', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center', border: '1px solid #374151' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          style={{ padding: '0.5rem', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
        >
          <option value="">All Support Levels</option>
          {supportLevels.map(lvl => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" style={{ margin: '0 auto 1rem' }} />
          Loading support agents...
        </div>
      ) : supportList.length === 0 ? (
        <div style={{ background: '#1f2937', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#9ca3af', border: '1px solid #374151' }}>
          No support agents found.
        </div>
      ) : (
        <div style={{ background: '#1f2937', borderRadius: '12px', overflow: 'hidden', border: '1px solid #374151' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#111827', borderBottom: '1px solid #374151', color: '#9ca3af', fontSize: '0.875rem' }}>
                <th style={{ padding: '1rem' }}>Support Agent</th>
                <th style={{ padding: '1rem' }}>Employee ID</th>
                <th style={{ padding: '1rem' }}>Department / Designation</th>
                <th style={{ padding: '1rem' }}>Support Details</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supportList.map((acc) => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #374151', color: '#e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', color: '#fff' }}>{acc.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{acc.email}</div>
                    {acc.phone && <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{acc.phone}</div>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', background: '#374151', color: '#d1d5db', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                      {acc.employee_code || 'â€”'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {acc.department ? (
                      <div>
                        <div style={{ fontWeight: '500' }}>{acc.department.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{acc.designation?.name || 'â€”'}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>â€”</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>
                      <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.8rem', marginRight: '0.5rem', fontWeight: 'bold' }}>
                        {acc.support_level || 'L1'}
                      </span>
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                        {acc.specialization || 'GENERAL'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {acc.is_active ? (
                      <span style={{ color: '#34d399' }}>Active</span>
                    ) : (
                      <span style={{ color: '#f87171' }}>Suspended</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`${basePath}/${acc.id}/edit`)}
                      style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', marginRight: '0.75rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(acc)}
                      style={{ background: 'transparent', border: 'none', color: acc.is_active ? '#fbbf24' : '#34d399', cursor: 'pointer', marginRight: '0.75rem' }}
                    >
                      {acc.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => setResetAccount(acc)}
                      style={{ background: 'transparent', border: 'none', color: '#d1d5db', cursor: 'pointer', marginRight: '0.75rem' }}
                      title="Reset Password"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => openActivity(acc)}
                      style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer' }}
                      title="Activity Logs"
                    >
                      <Activity size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="admin-dark-modal-backdrop">
          <div className="admin-dark-modal" style={{ maxWidth: 550 }}>
            <h2 style={{ margin: '0 0 1.5rem', color: '#f3f4f6', fontSize: '1.25rem', fontWeight: '600' }}>
              {editing ? `Edit Support Agent` : 'Add Support Agent'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="admin-form-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Agent Name"
                  
                  required
                />
              </div>

              <div>
                <label className="admin-form-label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@example.com"
                  
                  required
                />
              </div>

              <div>
                <label className="admin-form-label">Mobile Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  
                />
              </div>

              <div>
                <label className="admin-form-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? 'Leave blank to retain' : 'Password!12'}
                  
                  required={!editing}
                />
              </div>

              <div>
                <label className="admin-form-label">Department</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-form-label">Designation</label>
                <select
                  value={desigId}
                  onChange={(e) => setDesigId(e.target.value)}
                  
                  required
                >
                  <option value="">Select Designation</option>
                  {designations.filter(d => d.department === deptId || !deptId).map(desig => (
                    <option key={desig.id} value={desig.id}>{desig.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-form-label">Employee ID Code</label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="CSA-00001"
                  
                  required
                />
              </div>

              <div>
                <label className="admin-form-label">Support Level</label>
                <select
                  value={supportLevel}
                  onChange={(e) => setSupportLevel(e.target.value)}
                  
                >
                  {supportLevels.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="admin-form-label">Specialization</label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  
                >
                  {specializations.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={closeModal} style={{ background: 'transparent', border: '1px solid #4b5563', color: '#d1d5db', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetAccount && (
        <div className="admin-dark-modal-backdrop">
          <div className="admin-dark-modal" style={{ maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 1rem', color: '#fff' }}>Reset Password: {resetAccount.full_name}</h3>
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.85rem' }}>New Secure Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="NewSecurePassword!99"
                  
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setResetAccount(null)} style={{ background: 'transparent', border: '1px solid #4b5563', color: '#d1d5db', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#eab308', border: 'none', color: '#111827', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {activityAccount && (
        <div className="admin-dark-modal-backdrop">
          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', width: '100%', maxWidth: '650px', padding: '1.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity style={{ color: '#a78bfa' }} /> Action Logs: {activityAccount.full_name}
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', background: '#111827', borderRadius: '8px', padding: '1rem' }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading activity logs...</div>
              ) : activityLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No activity records found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activityLogs.map((log: any) => (
                    <div key={log.id} style={{ borderBottom: '1px solid #1f2937', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#a5b4fc', fontWeight: '600', fontSize: '0.9rem' }}>{log.action}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{new Date(log.created_at || log.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ color: '#d1d5db', fontSize: '0.85rem' }}>{log.details || log.description || 'Performed activity'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setActivityAccount(null)} style={{ background: '#4b5563', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Close Logs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
