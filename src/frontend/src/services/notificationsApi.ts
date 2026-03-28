import api from './api';
import type { ApiResponse, ListResponse } from '../types';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  content: string;
  relatedType: string | null;
  relatedId: string | null;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  actionText: string | null;
  createdAt: string;
}

function normalizeNotification(raw: Record<string, unknown>): AppNotification {
  return {
    id: String(raw.id ?? ''),
    type: String(raw.type ?? 'system'),
    title: String(raw.title ?? ''),
    content: String(raw.content ?? ''),
    relatedType: raw.related_type != null ? String(raw.related_type) : null,
    relatedId: raw.related_id != null ? String(raw.related_id) : null,
    isRead: Boolean(raw.is_read ?? raw.isRead),
    readAt: raw.read_at != null ? String(raw.read_at) : raw.readAt != null ? String(raw.readAt) : null,
    actionUrl: raw.action_url != null ? String(raw.action_url) : null,
    actionText: raw.action_text != null ? String(raw.action_text) : null,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
  };
}

export const notificationsAPI = {
  async list(params: {
    page?: number;
    page_size?: number;
    unread_only?: boolean;
  }): Promise<ListResponse<AppNotification>> {
    const { data } = await api.get<
      ApiResponse<{ items: Record<string, unknown>[]; pagination: ListResponse<AppNotification>['pagination'] }>
    >('/notifications', {
      params: {
        page: params.page,
        page_size: params.page_size,
        unread_only: params.unread_only ? 1 : undefined,
      },
    });
    const items = (data.data?.items ?? []).map((r) => normalizeNotification(r as Record<string, unknown>));
    const pagination = data.data?.pagination ?? {
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    };
    return { items, pagination };
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<ApiResponse<{ unread_count: number }>>('/notifications/unread-count');
    return data.data?.unread_count ?? 0;
  },

  async markRead(id: string): Promise<AppNotification> {
    const { data } = await api.patch<ApiResponse<Record<string, unknown>>>(`/notifications/${id}/read`);
    return normalizeNotification((data.data ?? {}) as Record<string, unknown>);
  },

  async markAllRead(): Promise<number> {
    const { data } = await api.post<ApiResponse<{ updated: number }>>('/notifications/read-all');
    return data.data?.updated ?? 0;
  },
};
