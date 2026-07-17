'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Headphones,
  Plus,
  User,
  Settings,
  Activity,
  RefreshCw,
  Sliders,
  Check,
  Search,
  Users,
  AlertTriangle,
  Clock,
  Briefcase
} from 'lucide-react';
import {
  useGetAssignmentRulesQuery,
  useCreateAssignmentRuleMutation,
  useUpdateAssignmentRuleMutation,
  useDeleteAssignmentRuleMutation,
  useGetAssignmentStrategiesQuery,
  useGetEmployeeAvailabilitiesQuery,
  useUpdateEmployeeAvailabilityMutation,
  useBulkReassignTicketsMutation,
  useBulkReassignWorkMutation
} from '../../services/assignmentApi';
import { useGetQueueItemsQuery } from '../../services/queueApi';
import { useGetAdminAnalyticsDashboardQuery } from '../../services/dashboardApi';
import { useGetEligibleStaffQuery, useGetEligibleSupportAgentsQuery } from '../../services/adminAssignmentsApi';
import { AdminPageHeader, AdminLoading, AdminErrorState } from '../../components/admin/AdminUI';

export default function AdminAssignmentsPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'rules' | 'availability' | 'override'>('analytics');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Queries
  const { data: dashboardData, refetch: refetchDashboard, isLoading: loadingDash } = useGetAdminAnalyticsDashboardQuery(undefined, {
    pollingInterval: 15000 // Poll every 15 seconds for live analytics updates
  });
  const { data: rulesList, refetch: refetchRules, isLoading: loadingRules } = useGetAssignmentRulesQuery();
  const { data: strategies } = useGetAssignmentStrategiesQuery();
  const { data: availabilities, refetch: refetchAvail } = useGetEmployeeAvailabilitiesQuery();

  // Rule creation states
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [createRule] = useCreateAssignmentRuleMutation();
  const [newRule, setNewRule] = useState({
    name: '',
    category_id: '',
    verification_type: '',
    priority: '',
    strategy_code: 'ROUND_ROBIN',
    priority_order: 0,
    is_active: true
  });

  // Toggle rule state
  const [updateRule] = useUpdateAssignmentRuleMutation();
  const [deleteRule] = useDeleteAssignmentRuleMutation();

  // Availability mutation
  const [updateAvailability] = useUpdateEmployeeAvailabilityMutation();

  // Queue Override tab states
  const [selectedQueue, setSelectedQueue] = useState('UNASSIGNED');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [targetWorkerId, setTargetWorkerId] = useState('');
  const { data: queueData, refetch: refetchQueue } = useGetQueueItemsQuery({ queue: selectedQueue });
  const [bulkReassignTickets] = useBulkReassignTicketsMutation();
  const [bulkReassignWork] = useBulkReassignWorkMutation();

  // Eligible worker list queries for manual overrides
  const { data: eligibleStaff } = useGetEligibleStaffQuery({});
  const { data: eligibleAgents } = useGetEligibleSupportAgentsQuery({});

  const showFlash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleToggleRule = async (id: string, currentVal: boolean) => {
    try {
      await updateRule({ id, body: { is_active: !currentVal } }).unwrap();
      showFlash(`Rule ${currentVal ? 'disabled' : 'enabled'} successfully.`);
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Failed to toggle rule.');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await deleteRule(id).unwrap();
      showFlash('Rule deleted successfully.');
    } catch (err: any) {
      setErrorMsg('Failed to delete rule.');
    }
  };

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim()) return;
    try {
      // Find strategy object
      const selectedStrat = strategies?.find(s => s.code === newRule.strategy_code);
      const payload: any = {
        name: newRule.name,
        strategy_id: selectedStrat?.id,
        priority_order: Number(newRule.priority_order),
        is_active: newRule.is_active
      };
      if (newRule.category_id) {
        payload.category_id = newRule.category_id;
      }
      if (newRule.verification_type) {
        payload.verification_type = newRule.verification_type;
      }
      if (newRule.priority) {
        payload.priority = newRule.priority;
      }

      await createRule(payload).unwrap();
      showFlash('Assignment rule created successfully.');
      setShowAddRuleModal(false);
      setNewRule({
        name: '',
        category_id: '',
        verification_type: '',
        priority: '',
        strategy_code: 'ROUND_ROBIN',
        priority_order: 0,
        is_active: true
      });
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Failed to create assignment rule.');
    }
  };

  const handleToggleOnlineStatus = async (id: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
      await updateAvailability({
        id,
        body: {
          is_online: nextStatus === 'AVAILABLE',
          availability_status: nextStatus
        }
      }).unwrap();
      showFlash('Availability status updated.');
    } catch (err: any) {
      setErrorMsg('Failed to update status.');
    }
  };

  const handleBulkReassign = async () => {
    if (selectedItems.length === 0 || !targetWorkerId) {
      setErrorMsg('Please select items and a team member.');
      return;
    }
    setErrorMsg('');
    try {
      if (selectedQueue === 'VERIFICATION') {
        await bulkReassignWork({
          verification_ids: selectedItems,
          assigned_to_staff: targetWorkerId,
          notes: 'Supervisor manual queue override'
        }).unwrap();
      } else {
        await bulkReassignTickets({
          ticket_ids: selectedItems,
          assigned_to_support: targetWorkerId,
          notes: 'Supervisor manual queue override'
        }).unwrap();
      }
      showFlash(`Successfully reassigned ${selectedItems.length} items.`);
      setSelectedItems([]);
      setTargetWorkerId('');
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Reassignment override failed.');
    }
  };

  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(x => x !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSelectAll = (items: any[]) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(x => x.id));
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Enterprise Routing"
        title="Routing & Workloads Dashboard"
        description="Monitor automated routing strategies, balance workload distribution queues, and override ticket allocations."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                refetchDashboard();
                refetchRules();
                refetchAvail();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RefreshCw size={14} /> Refresh Dashboard
            </button>
          </div>
        }
      />

      {successMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #10b981', color: '#065f46', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.15))', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.5rem 1rem',
            color: activeTab === 'analytics' ? '#6366f1' : 'var(--admin-text-muted, #6b7280)',
            borderBottom: activeTab === 'analytics' ? '2px solid #6366f1' : 'none',
            fontWeight: activeTab === 'analytics' ? '700' : '400',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Activity size={16} /> Queue Analytics & Workloads
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.5rem 1rem',
            color: activeTab === 'rules' ? '#6366f1' : 'var(--admin-text-muted, #6b7280)',
            borderBottom: activeTab === 'rules' ? '2px solid #6366f1' : 'none',
            fontWeight: activeTab === 'rules' ? '700' : '400',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Sliders size={16} /> Auto-Assignment Rules
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.5rem 1rem',
            color: activeTab === 'availability' ? '#6366f1' : 'var(--admin-text-muted, #6b7280)',
            borderBottom: activeTab === 'availability' ? '2px solid #6366f1' : 'none',
            fontWeight: activeTab === 'availability' ? '700' : '400',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Users size={16} /> Live Team Availability
        </button>

        <button
          onClick={() => setActiveTab('override')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.5rem 1rem',
            color: activeTab === 'override' ? '#6366f1' : 'var(--admin-text-muted, #6b7280)',
            borderBottom: activeTab === 'override' ? '2px solid #6366f1' : 'none',
            fontWeight: activeTab === 'override' ? '700' : '400',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Briefcase size={16} /> Manual Queue Override
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'analytics' && (
        <div>
          {loadingDash ? (
            <AdminLoading />
          ) : (
            <>
              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--admin-text-muted, #6b7280)', fontSize: '0.8rem', fontWeight: '600' }}>UNASSIGNED TICKETS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: '#f59e0b' }}>
                    {dashboardData?.metrics.unassigned_tickets ?? 0}
                  </div>
                </div>

                <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--admin-text-muted, #6b7280)', fontSize: '0.8rem', fontWeight: '600' }}>ACTIVE SUPPORT TICKETS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: '#3b82f6' }}>
                    {dashboardData?.metrics.open_tickets ?? 0}
                  </div>
                </div>

                <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--admin-text-muted, #6b7280)', fontSize: '0.8rem', fontWeight: '600' }}>ESCALATED TICKETS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: '#ef4444' }}>
                    {dashboardData?.metrics.escalated_tickets ?? 0}
                  </div>
                </div>

                <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--admin-text-muted, #6b7280)', fontSize: '0.8rem', fontWeight: '600' }}>OPEN VERIFICATIONS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: '#10b981' }}>
                    {dashboardData?.metrics.open_verifications ?? 0}
                  </div>
                </div>

                <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--admin-text-muted, #6b7280)', fontSize: '0.8rem', fontWeight: '600' }}>SLA VIOLATIONS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: '#991b1b' }}>
                    {dashboardData?.metrics.sla_violations ?? 0}
                  </div>
                </div>
              </div>

              {/* Workload Splits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Agent workloads */}
                <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', padding: '1.25rem', borderRadius: '12px' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Headphones size={18} /> Support Agents Workloads
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {dashboardData?.agent_performance.map((agent) => {
                      const loadPercent = Math.min(100, (agent.open_tickets / agent.capacity) * 100);
                      return (
                        <div key={agent.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: '600' }}>{agent.name}</span>
                            <span style={{ color: 'var(--admin-text-muted, #6b7280)' }}>
                              {agent.open_tickets} / {agent.capacity} tickets ({agent.urgent_tickets} urgent)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
                            <div style={{ width: `${loadPercent}%`, height: '100%', background: loadPercent > 80 ? '#ef4444' : loadPercent > 50 ? '#f59e0b' : '#10b981', borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Queue status distribution */}
                <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', padding: '1.25rem', borderRadius: '12px' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} /> Department Queues Distribution
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {dashboardData?.department_performance.map((dept, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{dept.name}</span>
                        <span style={{
                          fontSize: '0.75rem',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}>
                          {dept.open_count} open
                        </span>
                      </div>
                    ))}
                    {(!dashboardData?.department_performance || dashboardData.department_performance.length === 0) && (
                      <div style={{ color: 'var(--admin-text-muted, #6b7280)', textAlign: 'center', padding: '1.5rem 0' }}>No active tickets in queue.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Active Rules & Priorities</h3>
            <button
              onClick={() => setShowAddRuleModal(true)}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Plus size={16} /> Add Assignment Rule
            </button>
          </div>

          {loadingRules ? (
            <AdminLoading />
          ) : (
            <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.15))' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Rule Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Trigger Details</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Routing Strategy</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Priority Precedence</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Auto-routing Queue</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rulesList?.map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.15))' }}>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{rule.name}</td>
                      <td style={{ padding: '1rem' }}>
                        {rule.category ? (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>
                            Category: {rule.category}
                          </span>
                        ) : null}
                        {rule.verification_type ? (
                          <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>
                            Type: {rule.verification_type}
                          </span>
                        ) : null}
                        {rule.priority ? (
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px' }}>
                            Priority: {rule.priority}
                          </span>
                        ) : null}
                        {!rule.category && !rule.verification_type && !rule.priority && 'General Fallback'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{rule.strategy}</code>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{rule.priority_order}</td>
                      <td style={{ padding: '1rem' }}>{rule.queue || 'â€”'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: rule.is_active ? '#10b981' : '#6b7280',
                          fontWeight: '600'
                        }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: rule.is_active ? '#10b981' : '#6b7280' }} />
                          {rule.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleToggleRule(rule.id, rule.is_active)}
                            style={{
                              background: rule.is_active ? '#e5e7eb' : '#6366f1',
                              color: rule.is_active ? '#374151' : '#fff',
                              border: 'none',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            {rule.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            style={{
                              background: '#fee2e2',
                              color: '#ef4444',
                              border: 'none',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!rulesList || rulesList.length === 0) && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted, #6b7280)' }}>
                        No assignment rules found. Create one to begin auto-routing.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'availability' && (
        <div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700' }}>Live Agent Availability & Capacity Controls</h3>
          <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.15))' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Team Member</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role/Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Suspended</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Last Active</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {availabilities?.map((avail) => (
                  <tr key={avail.id} style={{ borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.15))' }}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{avail.employee_email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {avail.employee_id ? 'Staff Member' : 'Support Agent'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: avail.is_online ? '#10b981' : '#6b7280',
                        fontWeight: '600'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: avail.is_online ? '#10b981' : '#6b7280' }} />
                        {avail.availability_status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{avail.is_suspended ? 'YES (No assignments)' : 'No'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280' }}>
                        <Clock size={14} />
                        {avail.last_active_at ? new Date(avail.last_active_at).toLocaleTimeString() : 'Never'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleOnlineStatus(avail.id, avail.availability_status)}
                        style={{
                          background: avail.is_online ? '#fee2e2' : '#d1fae5',
                          color: avail.is_online ? '#ef4444' : '#065f46',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        {avail.is_online ? 'Go Offline' : 'Go Online'}
                      </button>
                    </td>
                  </tr>
                ))}
                {(!availabilities || availabilities.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted, #6b7280)' }}>
                      No live team availability records active.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'override' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select Queue:</label>
              <select
                value={selectedQueue}
                onChange={(e) => {
                  setSelectedQueue(e.target.value);
                  setSelectedItems([]);
                }}
                style={{
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                  background: 'transparent',
                  color: 'var(--admin-text, #111827)'
                }}
              >
                <option value="UNASSIGNED">Unassigned Tickets Queue</option>
                <option value="VERIFICATION">Verification Requests Queue</option>
                <option value="SUPPORT">General Support Queue</option>
                <option value="PAYMENT">Payments Support Queue</option>
                <option value="TECHNICAL">Technical Support Queue</option>
                <option value="ESCALATED">Escalated Tickets Queue</option>
              </select>
            </div>

            {selectedItems.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#e0e7ff', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: '600' }}>
                  {selectedItems.length} items selected
                </span>
                <select
                  value={targetWorkerId}
                  onChange={(e) => setTargetWorkerId(e.target.value)}
                  style={{
                    padding: '0.35rem',
                    borderRadius: '4px',
                    border: '1px solid #4338ca',
                    background: '#fff',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">-- Select Target Assignee --</option>
                  {selectedQueue === 'VERIFICATION'
                    ? eligibleStaff?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} (Load: {s.workload.assigned})
                        </option>
                      ))
                    : eligibleAgents?.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name} (Load: {a.workload.assigned})
                        </option>
                      ))}
                </select>
                <button
                  onClick={handleBulkReassign}
                  style={{
                    background: '#4338ca',
                    color: '#fff',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Apply Override
                </button>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.15))' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.length > 0 && selectedItems.length === queueData?.results.length}
                      onChange={() => handleSelectAll(queueData?.results || [])}
                    />
                  </th>
                  <th style={{ padding: '0.75rem 1rem' }}>Identifier / Target</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Subject / Detail</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Priority</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created At</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {queueData?.results.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.15))' }}>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                      />
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>
                      {item.ticket_number || item.verification_type_display || 'Verification Request'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {item.subject || `Verification request for ${item.member_name}`}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: item.priority === 'URGENT' || item.priority === 'HIGH' ? '#fee2e2' : '#f3f4f6',
                        color: item.priority === 'URGENT' || item.priority === 'HIGH' ? '#991b1b' : '#374151',
                        fontWeight: '600'
                      }}>
                        {item.priority}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {new Date(item.created_at || item.submitted_at || '').toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!queueData?.results || queueData.results.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted, #6b7280)' }}>
                      No items currently in this queue. Everything is cleanly balanced.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Assignment Rule Modal */}
      {showAddRuleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'var(--admin-surface, #fff)',
            border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
            borderRadius: '12px',
            width: '460px',
            maxWidth: '90%',
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            color: 'var(--admin-text, #111827)'
          }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontWeight: '700' }}>Add Auto-routing Rule</h3>
            <form onSubmit={handleCreateRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem' }}>Rule Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payments least workload trigger"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                    background: 'transparent',
                    color: 'var(--admin-text, #111827)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem' }}>Match Ticket Category (Optional):</label>
                <select
                  value={newRule.category_id}
                  onChange={(e) => setNewRule({ ...newRule, category_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                    background: 'transparent',
                    color: 'var(--admin-text, #111827)'
                  }}
                >
                  <option value="">-- All Categories --</option>
                  <option value="1">Account Issues</option>
                  <option value="2">Login Problems</option>
                  <option value="3">Payment</option>
                  <option value="4">Membership</option>
                  <option value="5">Technical Issues</option>
                  <option value="6">General Support</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem' }}>Match Verification Type (Optional):</label>
                <select
                  value={newRule.verification_type}
                  onChange={(e) => setNewRule({ ...newRule, verification_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                    background: 'transparent',
                    color: 'var(--admin-text, #111827)'
                  }}
                >
                  <option value="">-- All Types --</option>
                  <option value="FULL_PROFILE">Full Profile Verification</option>
                  <option value="PROFILE_PHOTO">Profile Photo Verification</option>
                  <option value="IDENTITY_DOCUMENT">Identity Document Verification</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem' }}>Match Priority (Optional):</label>
                <select
                  value={newRule.priority}
                  onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                    background: 'transparent',
                    color: 'var(--admin-text, #111827)'
                  }}
                >
                  <option value="">-- All Priorities --</option>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem' }}>Strategy:</label>
                  <select
                    value={newRule.strategy_code}
                    onChange={(e) => setNewRule({ ...newRule, strategy_code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                      background: 'transparent',
                      color: 'var(--admin-text, #111827)'
                    }}
                  >
                    <option value="ROUND_ROBIN">Round Robin</option>
                    <option value="LEAST_WORKLOAD">Least Workload</option>
                    <option value="SLA_AVAILABILITY">SLA Availability</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem' }}>Precedence Order:</label>
                  <input
                    type="number"
                    value={newRule.priority_order}
                    onChange={(e) => setNewRule({ ...newRule, priority_order: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                      background: 'transparent',
                      color: 'var(--admin-text, #111827)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowAddRuleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn"
                  style={{ background: '#6366f1', color: '#fff', border: 'none' }}
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
