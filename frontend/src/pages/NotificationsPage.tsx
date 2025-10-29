import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { AppLayout } from "../components/AppLayout";
import { api } from "../services/api";
import type { NotificationEntry } from "../types/notification";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const LIMIT_OPTIONS = [20, 30, 40, 50, 100];

type NotificationsPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
  };
  onLogout: () => void;
};

export function NotificationsPage({
  token,
  user,
  onLogout,
}: NotificationsPageProps) {
  const [limit, setLimit] = useState<number>(30);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    api
      .getNotifications(token, limit, controller.signal)
      .then((data) => setNotifications(data))
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to retrieve notification history."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [token, limit, refreshCount]);

  const latestTimestamp = useMemo(() => {
    if (notifications.length === 0) {
      return null;
    }
    return notifications[0].createdAt;
  }, [notifications]);

  const handleRefresh = () => {
    if (isLoading) {
      return;
    }
    setRefreshCount((value) => value + 1);
  };

  const refreshLabel = isLoading
    ? notifications.length > 0
      ? "Refreshing..."
      : "Loading..."
    : "Refresh";

  return (
    <AppLayout
      title="Puma Printables Portal"
      username={user.username}
      role={user.role}
      onLogout={onLogout}
    >
      <div className="content-header">
        <div className="content-title">
          <h2>Email notifications</h2>
          <p className="small-muted">
            Review the transactional emails generated as orders flow through the
            lifecycle.
          </p>
        </div>
        <div className="content-actions">
          <div className="toolbar">
            <label className="meta-block" htmlFor="notification-limit">
              <span className="meta-label">Entries</span>
              <select
                id="notification-limit"
                className="filter-select"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="secondary-button ghost"
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {refreshLabel}
          </button>
        </div>
      </div>

      {latestTimestamp ? (
        <div className="meta-block" style={{ marginBottom: "1.5rem" }}>
          <span className="meta-label">Most recent</span>
          <span>{dateFormatter.format(new Date(latestTimestamp))}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="centered">
          <div className="spinner" aria-label="Loading notifications" />
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <h3>No notifications captured yet</h3>
          <p className="small-muted">
            Approvals, rejections, and courier updates will appear here for demo
            walkthroughs.
          </p>
        </div>
      ) : (
        <div className="notification-grid">
          {notifications.map((notification, index) => (
            <article
              key={notification.id}
              className="notification-card"
              style={{ "--card-index": String(index) } as CSSProperties}
            >
              <header className="notification-header">
                <div>
                  <div className="meta-label">Subject</div>
                  <strong>{notification.subject}</strong>
                </div>
                <time dateTime={notification.createdAt}>
                  {dateFormatter.format(new Date(notification.createdAt))}
                </time>
              </header>

              <div className="notification-meta">
                <div className="meta-block">
                  <span className="meta-label">Recipients</span>
                  <span>{notification.recipients}</span>
                </div>
              </div>

              <pre className="notification-body">{notification.body}</pre>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
