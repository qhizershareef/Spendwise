import { create } from 'zustand';
import * as GoogleDrive from '@/services/googleDrive';

interface SyncState {
    isSignedIn: boolean;
    userEmail: string | null;
    isSyncing: boolean;
    lastSyncTime: string | null;
    lastError: string | null;

    signIn: (clientId?: string) => Promise<boolean>;
    signOut: () => void;
    syncNow: () => Promise<boolean>;
    restoreFromDrive: () => Promise<boolean>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    isSignedIn: false,
    userEmail: null,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,

    signIn: async (clientId?: string) => {
        const result = await GoogleDrive.signIn(clientId);
        if (result.success) {
            set({ isSignedIn: true, userEmail: result.email || null, lastError: null });
            return true;
        }
        set({ lastError: result.error || 'Sign-in failed' });
        return false;
    },

    signOut: () => {
        GoogleDrive.signOut();
        set({ isSignedIn: false, userEmail: null, lastSyncTime: null, lastError: null });
    },

    syncNow: async () => {
        if (get().isSyncing || !get().isSignedIn) return false;
        set({ isSyncing: true, lastError: null });

        const result = await GoogleDrive.uploadBackup();
        if (result.success) {
            set({ isSyncing: false, lastSyncTime: new Date().toISOString() });
            return true;
        }
        set({ isSyncing: false, lastError: result.error || 'Sync failed' });
        return false;
    },

    restoreFromDrive: async () => {
        if (get().isSyncing || !get().isSignedIn) return false;
        set({ isSyncing: true, lastError: null });

        const result = await GoogleDrive.downloadBackup();
        if (result.success) {
            set({ isSyncing: false, lastSyncTime: new Date().toISOString() });
            return true;
        }
        set({ isSyncing: false, lastError: result.error || 'Restore failed' });
        return false;
    },
}));
