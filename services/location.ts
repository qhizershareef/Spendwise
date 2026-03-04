/**
 * Location Service
 * Captures user location at time of payment
 */
import * as ExpoLocation from 'expo-location';
import type { Location } from '@/types';

let locationPermissionGranted = false;

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<boolean> {
    try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        locationPermissionGranted = status === 'granted';
        return locationPermissionGranted;
    } catch {
        return false;
    }
}

/**
 * Get current location
 */
export async function getCurrentLocation(): Promise<Location | null> {
    try {
        if (!locationPermissionGranted) {
            const granted = await requestLocationPermission();
            if (!granted) return null;
        }

        // Use low accuracy for fast response, with a timeout
        const locationPromise = ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Low,
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        const location = await Promise.race([locationPromise, timeoutPromise]);

        if (!location) return null;

        // Return coords immediately — reverse geocode in background
        const result: Location = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
        };

        // Non-blocking reverse geocode
        ExpoLocation.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        }).then((geocode) => {
            if (geocode.length > 0) {
                const place = geocode[0];
                const parts = [place.name, place.city, place.region].filter(Boolean);
                result.name = parts.join(', ');
            }
        }).catch(() => { });

        return result;
    } catch (error) {
        console.error('Failed to get location:', error);
        return null;
    }
}

/**
 * Check if location permission is granted
 */
export async function hasLocationPermission(): Promise<boolean> {
    try {
        const { status } = await ExpoLocation.getForegroundPermissionsAsync();
        locationPermissionGranted = status === 'granted';
        return locationPermissionGranted;
    } catch {
        return false;
    }
}
