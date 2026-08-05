export function isValidPassword(password: string): boolean {
    return password.length >= 8;
}

export function isStrongPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}
