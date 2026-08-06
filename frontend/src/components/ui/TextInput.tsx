'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { IoMdEyeOff, IoMdEye } from 'react-icons/io';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    ({ label, error, helperText, className, required, type = '', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState<boolean>(false);
        const inputType = type === 'password' && showPassword ? 'text' : type;
        return (
            <div className="flex flex-col gap-1 w-full">
                {label && (
                    <label className="text-sm font-medium text-ink">
                        {label}{required && <span className='text-muted ml-1'>*</span>}
                    </label>
                )}
                <div className='flex gap-2 items-center'>
                    <input
                        ref={ref}
                        type={inputType||"text"}
                        className={`
                        px-3 py-2 border rounded-md transition-colors w-full
                        bg-[var(--color-surface)] text-ink
                        focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand
                        ${error
                                ? 'border-danger focus:ring-danger/50 focus:border-danger'
                                : 'border-[var(--color-border)] hover:border-ink-soft/30'
                            }
                        ${className ?? ''}
                        `}
                        {...props}
                    />
                    {
                        type === 'password' &&
                        <button type='button'  onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <IoMdEyeOff size={25} /> : <IoMdEye size={25} />}
                        </button>
                    }
                </div>

                {error && (
                    <span className="text-sm text-danger">{error}</span>
                )}

                {helperText && !error && (
                    <span className="text-sm text-muted">{helperText}</span>
                )}
            </div>
        );
    }
);

TextInput.displayName = 'TextInput';

export default TextInput;
