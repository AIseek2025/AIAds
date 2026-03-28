import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin, AdminRole, AdminPermission } from '../types';

interface AdminAuthState {
  admin: Admin | null;
  role: AdminRole | null;
  permissions: AdminPermission[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (admin: Admin, accessToken: string, refreshToken: string, role?: AdminRole, permissions?: AdminPermission[]) => void;
  logout: () => void;
  updateAdmin: (admin: Partial<Admin>) => void;
  setPermissions: (permissions: AdminPermission[]) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => boolean;

  // Permission checks
  hasPermission: (permission: AdminPermission) => boolean;
  hasAnyPermission: (permissions: AdminPermission[]) => boolean;
  hasAllPermissions: (permissions: AdminPermission[]) => boolean;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      role: null,
      permissions: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      // 客户端路由需在首帧即可判断是否跳转；持久化恢复后由 checkAuth 同步（见 persist.onRehydrateStorage）
      isLoading: false,

      login: (admin, accessToken, refreshToken, role, permissions) => {
        localStorage.setItem('adminAccessToken', accessToken);
        localStorage.setItem('adminRefreshToken', refreshToken);
        set({
          admin,
          role: role || null,
          permissions: permissions || [],
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        set({
          admin: null,
          role: null,
          permissions: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateAdmin: (adminData) => {
        set((state) => ({
          admin: state.admin ? { ...state.admin, ...adminData } : null,
        }));
      },

      setPermissions: (permissions) => {
        set({ permissions });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      checkAuth: () => {
        const accessToken = localStorage.getItem('adminAccessToken');
        const admin = get().admin;

        if (accessToken && admin) {
          set({ isAuthenticated: true, isLoading: false });
          return true;
        }

        // 无 token：清掉 persist 中可能残留的 admin 会话，避免未登录仍被视为已登录
        if (!accessToken) {
          localStorage.removeItem('adminRefreshToken');
          set({
            admin: null,
            role: null,
            permissions: [],
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }

        // 有 token 但 admin 尚未恢复（persist 未完成首帧）：不清理 token，仅暂不标为已登录
        set({ isAuthenticated: false, isLoading: false });
        return false;
      },

      // Permission check helpers
      hasPermission: (permission) => {
        // Super admin has all permissions
        if (get().role === 'super_admin') {
          return true;
        }
        return get().permissions.includes(permission);
      },

      hasAnyPermission: (permissions) => {
        // Super admin has all permissions
        if (get().role === 'super_admin') {
          return true;
        }
        return permissions.some((p) => get().permissions.includes(p));
      },

      hasAllPermissions: (permissions) => {
        // Super admin has all permissions
        if (get().role === 'super_admin') {
          return true;
        }
        return permissions.every((p) => get().permissions.includes(p));
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        role: state.role,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        const p =
          persistedState && typeof persistedState === 'object'
            ? (persistedState as Partial<AdminAuthState>)
            : {};
        return {
          ...currentState,
          ...p,
          // 不参与持久化；旧存储若含 true 会导致 ProtectedAdminRoute 永久 Loading
          isLoading: false,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) return;
        useAdminAuthStore.getState().checkAuth();
      },
    }
  )
);

// App state for admin panel
interface AdminAppState {
  sidebarCollapsed: boolean;
  currentTheme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;
}

export const useAdminAppStore = create<AdminAppState>((set) => ({
  sidebarCollapsed: false,
  currentTheme: 'light',
  language: 'zh-CN',

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setTheme: (theme) => {
    set({ currentTheme: theme });
  },

  setLanguage: (lang) => {
    set({ language: lang });
  },
}));

export default useAdminAuthStore;
