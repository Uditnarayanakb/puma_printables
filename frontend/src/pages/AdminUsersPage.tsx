import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { AppLayout } from "../components/AppLayout";
import { api } from "../services/api";
import type { ManagedUser, UserMetrics } from "../types/user";
import type { UserRole } from "../types/order";

const ROLE_OPTIONS: UserRole[] = [
  "STORE_USER",
  "APPROVER",
  "FULFILLMENT_AGENT",
  "ADMIN",
];

const roleLabels: Record<UserRole, string> = {
  STORE_USER: "Store",
  APPROVER: "Approver",
  FULFILLMENT_AGENT: "Fulfillment",
  ADMIN: "Admin",
};

const metricsFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type AdminUsersPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
    id?: string | null;
  };
  onLogout: () => void;
  onSessionRefresh: () => Promise<void>;
};

export function AdminUsersPage({
  token,
  user,
  onLogout,
  onSessionRefresh,
}: AdminUsersPageProps) {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [metricsDays, setMetricsDays] = useState(30);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [downloadDays, setDownloadDays] = useState(30);
  const [downloadPending, setDownloadPending] = useState(false);

  const isAdmin = useMemo(() => user.role === "ADMIN", [user.role]);

  const fetchMetrics = useCallback(
    async (lookback: number) => {
      try {
        setMetricsLoading(true);
        setMetricsError(null);
        const response = await api.getUserMetrics(token, lookback);
        setMetrics(response);
      } catch (err) {
        setMetricsError(
          err instanceof Error
            ? err.message
            : "Unable to load user metrics right now"
        );
      } finally {
        setMetricsLoading(false);
      }
    },
    [token]
  );

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      const response = await api.getManagedUsers(token);
      setManagedUsers(response);
    } catch (err) {
      setUsersError(
        err instanceof Error
          ? err.message
          : "Unable to load user directory right now"
      );
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchMetrics(metricsDays).catch(() => undefined);
  }, [fetchMetrics, metricsDays, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchUsers().catch(() => undefined);
  }, [fetchUsers, isAdmin]);

  useEffect(() => {
    if (!feedbackMessage) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setFeedbackMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [feedbackMessage]);

  const handleMetricsDaysChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(next)) {
      return;
    }
    setMetricsDays(next);
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadPending(true);
      const blob = await api.downloadOnboardingReport(token, downloadDays);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `onboarding-last-${downloadDays}-days.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFeedbackMessage(
        err instanceof Error
          ? err.message
          : "Unable to download onboarding report"
      );
    } finally {
      setDownloadPending(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    const current = managedUsers.find((entry) => entry.id === userId);
    if (!current || current.role === nextRole) {
      return;
    }

    const previousRole = current.role;
    setFeedbackMessage(null);
    setManagedUsers((prev) =>
      prev.map((entry) =>
        entry.id === userId ? { ...entry, role: nextRole } : entry
      )
    );

    try {
      setUpdatingUserId(userId);
      const updated = await api.updateUserRole(token, userId, {
        role: nextRole,
      });

      setManagedUsers((prev) =>
        prev.map((entry) => (entry.id === userId ? updated : entry))
      );

      const isSelfUpdate =
        (user.id && updated.id === user.id) ||
        updated.username === user.username;
      if (isSelfUpdate) {
        await onSessionRefresh();
      }

      await fetchMetrics(metricsDays).catch(() => undefined);
      setFeedbackMessage(`Role updated to ${roleLabels[nextRole]}`);
    } catch (err) {
      setManagedUsers((prev) =>
        prev.map((entry) =>
          entry.id === userId ? { ...entry, role: previousRole } : entry
        )
      );
      setFeedbackMessage(
        err instanceof Error
          ? err.message
          : "Unable to update user role right now"
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const renderMetrics = () => {
    if (metricsLoading) {
      return <div className="skeleton-line skeleton-line-md" />;
    }
    if (metricsError) {
      return <div className="error-banner">{metricsError}</div>;
    }
    if (!metrics) {
      return null;
    }

    const summary = [
      {
        label: "Total users",
        value: metrics.totalUsers,
      },
      {
        label: `Active (last ${metrics.lookbackDays} days)`,
        value: metrics.activeUsers,
      },
      {
        label: "Store roles",
        value: metrics.storeUsers,
      },
      {
        label: "Approvers",
        value: metrics.approvers,
      },
      {
        label: "Fulfilment",
        value: metrics.fulfillmentAgents,
      },
      {
        label: "Admins",
        value: metrics.admins,
      },
    ];

    return (
      <div className="metrics-grid">
        {summary.map((item) => (
          <div key={item.label} className="metric-card">
            <span className="metric-label">{item.label}</span>
            <strong>{metricsFormatter.format(item.value)}</strong>
          </div>
        ))}
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <AppLayout
        title="User management"
        username={user.username}
        role={user.role}
        onLogout={onLogout}
      >
        <div className="centered">
          <p className="error-banner">
            You do not have permission to view this page.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="User management"
      username={user.username}
      role={user.role}
      onLogout={onLogout}
    >
      <div className="content-header">
        <div className="content-title">
          <h2>Access overview</h2>
          <p className="small-muted">
            Track onboarding progress and adjust collaborator permissions in
            real time.
          </p>
        </div>
        <div className="content-actions">
          <label className="inline-field" htmlFor="metrics-window">
            <span className="small-muted">Activity window</span>
            <select
              id="metrics-window"
              value={metricsDays}
              onChange={handleMetricsDaysChange}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>
      </div>

      {feedbackMessage ? (
        <div className="info-banner" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      {renderMetrics()}

      <section className="panel">
        <header className="panel-header">
          <div>
            <h3>Download onboarding report</h3>
            <p className="small-muted">
              Export the latest store onboarding activity for audit or review.
            </p>
          </div>
          <div className="panel-actions">
            <label className="inline-field" htmlFor="download-window">
              <span className="small-muted">Look-back days</span>
              <input
                id="download-window"
                type="number"
                min={1}
                max={180}
                value={downloadDays}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isNaN(next)) {
                    setDownloadDays(1);
                    return;
                  }
                  setDownloadDays(Math.min(180, Math.max(1, next)));
                }}
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={handleDownloadReport}
              disabled={downloadPending}
            >
              {downloadPending ? "Preparing…" : "Download"}
            </button>
          </div>
        </header>
      </section>

      <section className="panel">
        <header className="panel-header">
          <div>
            <h3>User directory</h3>
            <p className="small-muted">
              Promote or demote collaborators as their responsibilities evolve.
            </p>
          </div>
        </header>

        {usersError ? <div className="error-banner">{usersError}</div> : null}

        {usersLoading ? (
          <div className="centered">
            <div className="spinner" aria-label="Loading users" />
          </div>
        ) : managedUsers.length === 0 ? (
          <p className="small-muted">No users found.</p>
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Username</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Provider</th>
                  <th scope="col">First login</th>
                  <th scope="col">Last login</th>
                  <th scope="col">Logins</th>
                </tr>
              </thead>
              <tbody>
                {managedUsers.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.username}</td>
                    <td>{entry.email ?? "—"}</td>
                    <td>
                      <select
                        className="admin-role-select"
                        value={entry.role}
                        onChange={(event) =>
                          handleRoleChange(
                            entry.id,
                            event.target.value as UserRole
                          )
                        }
                        disabled={updatingUserId === entry.id}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {roleLabels[option]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{entry.authProvider ?? "—"}</td>
                    <td>
                      {entry.firstLoginAt
                        ? dateFormatter.format(new Date(entry.firstLoginAt))
                        : "—"}
                    </td>
                    <td>
                      {entry.lastLoginAt
                        ? dateFormatter.format(new Date(entry.lastLoginAt))
                        : "—"}
                    </td>
                    <td>{entry.loginCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
