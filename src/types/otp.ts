export type OTPVerificationResult = {
    success: boolean;
    error?: 'INVALID_CODE' | 'EXPIRED' | 'NOT_FOUND' | 'ALREADY_VERIFIED' | 'SERVER_ERROR';
};

export type OTPRecord = {
    id: number;
    email: string;
    code: string;
    expires_at: Date;
    verified: boolean;
    created_at: Date;
};
