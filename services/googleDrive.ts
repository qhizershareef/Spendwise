import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { exportAllData, importAllData } from './storage';

/**
 * Google Drive sync service
 * Uses @react-native-google-signin for native auth + Drive REST API v3
 * Files are stored in the hidden appDataFolder (private to this app)
 */

const BACKUP_FILENAME = 'spendwise-backup.json';

// ─── Configuration ───────────────────────────────────────

export function configureGoogleSignIn(webClientId: string) {
    GoogleSignin.configure({
        webClientId,
        scopes: [
            'https://www.googleapis.com/auth/drive.appdata',
        ],
        offlineAccess: true,
    });
}

// ─── Auth ────────────────────────────────────────────────

export async function signIn(): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const email = (userInfo as any)?.data?.user?.email || (userInfo as any)?.user?.email;
        return { success: true, email: email || undefined };
    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            return { success: false, error: 'Sign-in cancelled' };
        }
        if (error.code === statusCodes.IN_PROGRESS) {
            return { success: false, error: 'Sign-in already in progress' };
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            return { success: false, error: 'Google Play Services not available' };
        }
        console.error('Google sign-in error:', error);
        return { success: false, error: error?.message || 'Sign-in failed' };
    }
}

export async function signOut(): Promise<void> {
    try {
        await GoogleSignin.signOut();
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

export async function isSignedIn(): Promise<boolean> {
    return GoogleSignin.getCurrentUser() !== null;
}

export function getUserEmail(): string | null {
    const user = GoogleSignin.getCurrentUser();
    return (user as any)?.data?.user?.email || (user as any)?.user?.email || null;
}

async function getAccessToken(): Promise<string> {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
}

// ─── Drive File Operations (appDataFolder) ───────────────

async function findBackupFile(): Promise<string | null> {
    const accessToken = await getAccessToken();

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.files?.[0]?.id || null;
}

export async function uploadBackup(): Promise<{ success: boolean; error?: string }> {
    try {
        const accessToken = await getAccessToken();
        const allData = await exportAllData();
        const backupData = JSON.stringify({
            appName: 'SpendWise',
            backupDate: new Date().toISOString(),
            version: '1.0.0',
            ...allData,
        });

        const existingFileId = await findBackupFile();

        // Multipart upload (metadata + content)
        const boundary = '---spendwise-boundary---';

        if (existingFileId) {
            // Update existing file — PATCH only needs the media content
            const response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: backupData,
                }
            );
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Update failed: ${response.status} - ${err}`);
            }
        } else {
            // Create new file — multipart with metadata + content
            const metadata = JSON.stringify({
                name: BACKUP_FILENAME,
                parents: ['appDataFolder'],
            });

            const body = [
                `--${boundary}`,
                'Content-Type: application/json; charset=UTF-8',
                '',
                metadata,
                `--${boundary}`,
                'Content-Type: application/json',
                '',
                backupData,
                `--${boundary}--`,
            ].join('\r\n');

            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`,
                    },
                    body,
                }
            );

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Upload failed: ${response.status} - ${err}`);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Upload error:', error);
        return { success: false, error: error?.message || 'Upload failed' };
    }
}

export async function downloadBackup(): Promise<{ success: boolean; error?: string }> {
    try {
        const accessToken = await getAccessToken();
        const fileId = await findBackupFile();

        if (!fileId) {
            return { success: false, error: 'No backup found on Google Drive' };
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.months || !Array.isArray(data.months)) {
            throw new Error('Invalid backup format');
        }

        await importAllData(data);
        return { success: true };
    } catch (error: any) {
        console.error('Download error:', error);
        return { success: false, error: error?.message || 'Download failed' };
    }
}

export async function getBackupInfo(): Promise<{ exists: boolean; lastModified?: string } | null> {
    try {
        const accessToken = await getAccessToken();
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) return null;
        const data = await response.json();
        const file = data.files?.[0];
        return file ? { exists: true, lastModified: file.modifiedTime } : { exists: false };
    } catch {
        return null;
    }
}
