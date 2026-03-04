import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { exportAllData, importAllData } from './storage';

// Ensure auth session completes properly
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Drive sync service
 * Uses OAuth2 Implicit Grant with Google Drive REST API v3
 */

const GOOGLE_CLIENT_ID = '555178069411-gs2c83fgsu3d1s4cnehe5u6983deeffr.apps.googleusercontent.com';
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.email'];
const BACKUP_FILENAME = 'spendwise-backup.json';
const BACKUP_MIME = 'application/json';

// ─── Token Management ────────────────────────────────────

let accessToken: string | null = null;
let userEmail: string | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

export function getUserEmail(): string | null {
    return userEmail;
}

export function isSignedIn(): boolean {
    return !!accessToken;
}

// ─── OAuth Sign In (Implicit Token Flow) ─────────────────

export async function signIn(clientId?: string): Promise<{ success: boolean; email?: string; error?: string }> {
    const effectiveClientId = clientId || GOOGLE_CLIENT_ID;
    if (!effectiveClientId) {
        return { success: false, error: 'Google Client ID not configured' };
    }

    try {
        // Use Expo auth proxy for Expo Go — generates https://auth.expo.io URL
        const redirectUri = AuthSession.makeRedirectUri({
            scheme: 'spendwise',
            preferLocalhost: false,
        });

        // For Expo Go, manually build the proxy redirect
        const proxyRedirectUri = 'https://auth.expo.io/@anonymous/spendwise';

        console.log('OAuth redirect URI:', redirectUri);
        console.log('Proxy redirect URI:', proxyRedirectUri);

        const discovery = {
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
        };

        // Use implicit flow — returns access_token directly, no code exchange needed
        const authRequest = new AuthSession.AuthRequest({
            clientId: effectiveClientId,
            redirectUri: proxyRedirectUri,
            scopes: SCOPES,
            responseType: AuthSession.ResponseType.Token,
            usePKCE: false,
        });

        const result = await authRequest.promptAsync(discovery);

        if (result.type !== 'success') {
            return { success: false, error: result.type === 'cancel' ? 'Sign-in cancelled' : 'Sign-in failed' };
        }

        // Token is returned directly in the URL fragment
        const token = result.params?.access_token;
        if (!token) {
            return { success: false, error: 'No access token received' };
        }

        accessToken = token;

        // Get user email
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            userEmail = userInfo.email || null;
        }

        return { success: true, email: userEmail || undefined };
    } catch (error: any) {
        console.error('Google sign-in error:', error);
        return { success: false, error: error?.message || 'Unknown error' };
    }
}

export function signOut(): void {
    accessToken = null;
    userEmail = null;
}

// ─── Drive File Operations ───────────────────────────────

async function findBackupFile(): Promise<string | null> {
    if (!accessToken) return null;

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)&spaces=drive`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.files?.[0]?.id || null;
}

export async function uploadBackup(): Promise<{ success: boolean; error?: string }> {
    if (!accessToken) return { success: false, error: 'Not signed in' };

    try {
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
        const metadata = JSON.stringify({
            name: BACKUP_FILENAME,
            mimeType: BACKUP_MIME,
        });

        const body = [
            `--${boundary}`,
            'Content-Type: application/json; charset=UTF-8',
            '',
            metadata,
            `--${boundary}`,
            `Content-Type: ${BACKUP_MIME}`,
            '',
            backupData,
            `--${boundary}--`,
        ].join('\r\n');

        let url: string;
        let method: string;
        if (existingFileId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
            method = 'PATCH';
        } else {
            url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            method = 'POST';
        }

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Upload failed: ${response.status} - ${err}`);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Upload error:', error);
        return { success: false, error: error?.message || 'Upload failed' };
    }
}

export async function downloadBackup(): Promise<{ success: boolean; error?: string }> {
    if (!accessToken) return { success: false, error: 'Not signed in' };

    try {
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

        // Validate structure
        if (!data.months || !Array.isArray(data.months)) {
            throw new Error('Invalid backup format');
        }

        // Import into local storage
        await importAllData(data);

        return { success: true };
    } catch (error: any) {
        console.error('Download error:', error);
        return { success: false, error: error?.message || 'Download failed' };
    }
}

export async function getBackupInfo(): Promise<{ exists: boolean; lastModified?: string } | null> {
    if (!accessToken) return null;

    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)&spaces=drive`,
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
