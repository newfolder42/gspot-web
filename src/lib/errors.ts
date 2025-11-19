class AppError extends Error {
    code: string;
    constructor(message: string, code = 'INTERNAL') {
        super(message);
        this.name = 'AppError';
        this.code = code;
    }
}

export default AppError;