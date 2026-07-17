'use client';

import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, CircleAlert, Inbox,
  LoaderCircle, LockKeyhole, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  showBackButton = false,
  backFallback = '/admin/dashboard',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
  backFallback?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="admin-page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {showBackButton && (
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(backFallback);
              }
            }}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <div>
          {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="admin-page-description">{description}</p>}
        </div>
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

export function AdminPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-panel ${className}`}>
      {(title || subtitle || action) && (
        <div className="admin-panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const positiveStatus = ['active', 'approved', 'paid', 'resolved', 'verified', 'success', 'successful', 'completed'];
const warningStatus = ['pending', 'under review', 'open', 'waiting', 'unverified'];
const dangerStatus = ['blocked', 'rejected', 'failed', 'suspended', 'deactivated', 'cancelled'];
const infoStatus = ['assigned', 'in progress', 'premium', 'contacted'];

export function AdminStatusBadge({ status }: { status?: string | null }) {
  const value = status || 'Unknown';
  const normalized = value.replaceAll('_', ' ').toLowerCase();
  const tone = positiveStatus.includes(normalized)
    ? 'success'
    : warningStatus.includes(normalized)
      ? 'warning'
      : dangerStatus.includes(normalized)
        ? 'danger'
        : infoStatus.includes(normalized)
          ? 'info'
          : 'neutral';
  return <span className={`admin-status admin-status-${tone}`}>{value.replaceAll('_', ' ')}</span>;
}

export function AdminLoading({ label = 'Loading secure workspaceâ€¦' }: { label?: string }) {
  return (
    <div className="admin-state admin-loading-state" role="status">
      <LoaderCircle className="admin-spinner" />
      <strong>{label}</strong>
      <span>Please wait while the latest data is secured.</span>
    </div>
  );
}

export function AdminEmptyState({
  title = 'Nothing here yet',
  description = 'There are no records matching this view.',
  action,
  icon: Icon = Inbox,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: any;
}) {
  return (
    <div className="admin-state admin-empty-state">
      <span className="admin-state-icon"><Icon /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="admin-state admin-error-state" role="alert">
      <span className="admin-state-icon"><CircleAlert /></span>
      <strong>We couldnâ€™t load this view</strong>
      <p>{message}</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'center' }}>
        {onRetry && <button type="button" className="admin-btn admin-btn-secondary" onClick={onRetry}>Try again</button>}
        <Link to="/" className="admin-btn admin-btn-secondary">Go Back</Link>
      </div>
    </div>
  );
}

export function AdminSkeleton({ rows = 5, cols = 4, type = 'table' }: { rows?: number; cols?: number; type?: 'table' | 'cards' | 'chart' }) {
  if (type === 'cards') {
    return (
      <div className="admin-skeleton-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="admin-skeleton-card" style={{ background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.08))', borderRadius: '12px', padding: '1.25rem' }}>
            <div className="admin-skeleton-shimmer" style={{ width: '40%', height: '18px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '1rem' }} />
            <div className="admin-skeleton-shimmer" style={{ width: '80%', height: '14px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '0.5rem' }} />
            <div className="admin-skeleton-shimmer" style={{ width: '60%', height: '14px', background: '#f3f4f6', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="admin-skeleton-chart" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.08))', borderRadius: '12px' }}>
        <div className="admin-skeleton-shimmer" style={{ width: '30%', height: '20px', background: '#e5e7eb', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: '1rem', paddingTop: '1rem' }}>
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="admin-skeleton-shimmer" style={{ flex: 1, height: `${20 + Math.random() * 80}%`, background: '#f3f4f6', borderRadius: '4px 4px 0 0' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-skeleton-table-container" style={{ width: '100%', padding: '1.5rem', background: 'var(--admin-surface, #fff)', border: '1px solid var(--admin-line, rgba(0,0,0,0.08))', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div className="admin-skeleton-shimmer" style={{ width: '20%', height: '24px', background: '#e5e7eb', borderRadius: '4px' }} />
        <div className="admin-skeleton-shimmer" style={{ width: '10%', height: '24px', background: '#e5e7eb', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--admin-line, #f3f4f6)', paddingBottom: '1rem' }}>
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div key={cIdx} className="admin-skeleton-shimmer" style={{ flex: cIdx === 0 ? 2 : 1, height: '16px', background: '#f3f4f6', borderRadius: '4px' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAccessDenied() {
  const { user } = useAuth();
  
  // Resolve correct return path
  let dashboardPath = '/admin/dashboard';
  if (user?.account_type === 'SUPER_ADMIN') {
    dashboardPath = '/super-admin/dashboard';
  } else if (user?.admin_role === 'STAFF') {
    dashboardPath = '/staff/dashboard';
  } else if (user?.admin_role === 'CUSTOMER_SUPPORT') {
    dashboardPath = '/customer-support/dashboard';
  }

  return (
    <div className="admin-access-denied" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
      <span className="admin-state-icon" style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(195, 68, 78, 0.1)', color: 'var(--admin-red, #c3444e)', borderRadius: '50%', marginBottom: '1.5rem' }}><LockKeyhole size={48} /></span>
      <p className="admin-eyebrow" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.15em', fontWeight: 'bold', color: 'var(--admin-red, #c3444e)', marginBottom: '0.5rem' }}>403 Â· Restricted</p>
      <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--admin-ink, #211a20)' }}>This area is outside your role.</h1>
      <p style={{ maxWidth: '460px', color: 'var(--admin-muted, #766d74)', marginBottom: '2rem', fontSize: '0.95rem' }}>Your account does not have the required permission. If this appears incorrect, contact a Super Admin.</p>
      <Link to={dashboardPath} className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
        Return to Dashboard
      </Link>
    </div>
  );
}

export function AdminPermissionGate({
  anyOf = [],
  children,
  fallback = null,
}: {
  anyOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, hasAnyAdminPermission } = useAuth();
  if (user?.admin_role === 'SUPER_ADMIN' || hasAnyAdminPermission(...anyOf)) return <>{children}</>;
  return <>{fallback}</>;
}

export function AdminPagination({
  page,
  count,
  pageSize = 20,
  onPageChange,
}: {
  page: number;
  count: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="admin-pagination" aria-label="Pagination">
      <p>Page <strong>{page}</strong> of <strong>{pages}</strong> Â· {count} records</p>
      <div>
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft /></button>
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPageChange(page + 1)}><ChevronRight /></button>
      </div>
    </div>
  );
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm action',
  dangerous = true,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  dangerous?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onCancel()}>
      <div className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title">
        <span className={`admin-confirm-icon ${dangerous ? 'danger' : ''}`}><AlertTriangle /></span>
        <h2 id="admin-confirm-title">{title}</h2>
        <div style={{ margin: '0.5rem 0 1rem', fontSize: '0.85rem', color: 'var(--admin-muted)' }}>{description}</div>
        <div className="admin-dialog-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`admin-btn ${dangerous ? 'admin-btn-danger' : 'admin-btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <LoaderCircle className="admin-spinner" />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminModal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <header>
          <div>
            <p className="admin-eyebrow">Secure action</p>
            <h2 id="admin-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function AdminToast({
  message,
  tone = 'success',
  onClose,
}: {
  message: string;
  tone?: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`admin-toast admin-toast-${tone}`} role="status">
      <span>{tone === 'success' ? <Check /> : <CircleAlert />}</span>
      <p>{message}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss"><X /></button>
    </div>
  );
}

export const formatAdminDate = (value?: string | null, includeTime = false) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
};

export const formatAdminMoney = (value?: string | number | null) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Number(value || 0));

