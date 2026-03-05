declare module '@maniac-tech/react-native-expo-read-sms' {
    export function checkIfHasSMSPermission(): Promise<{
        hasReceiveSmsPermission: boolean;
        hasReadSmsPermission: boolean;
    }>;
    export function requestReadSMSPermission(): Promise<boolean>;
    export function startReadSMS(
        successCallback: (status: string, smsData: string, error: any) => void,
        errorCallback: (error: any) => void
    ): void;
}
