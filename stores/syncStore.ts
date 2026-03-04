import { create } from 'zustand';
import * as GoogleDrive from '@/services/googleDrive';

interface SyncState {
    isSignedIn: boolean;
    userEmail: string | null;
    isSyncing: boolean;
    lastSyncTime: string | null;
    lastError: string | null;

    checkSignInStatus: () => Promise<void>;
    signIn: () => Promise<boolean>;
    signOut: () => Promise<void>;
    syncNow: () => Promise<boolean>;
    restoreFromDrive: () => Promise<boolean>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    isSignedIn: false,
    userEmail: null,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,

    checkSignInStatus: async () => {
        const signedIn = await GoogleDrive.isSignedIn();
        const email = GoogleDrive.getUserEmail();
        set({ isSignedIn: signedIn, userEmail: email });
    },

    signIn: async () => {
        const result = await GoogleDrive.signIn();
        if (result.success) {
            set({ isSignedIn: true, userEmail: result.email || null, lastError: null });
            return true;
        }
        set({ lastError: result.error || 'Sign-in failed' });
        return false;
    },

    signOut: async () => {
        await GoogleDrive.signOut();
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
