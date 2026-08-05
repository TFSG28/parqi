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
                    <label className="text-sm font-medium text-gray-700">
                        {label}{required && <span className='text-gray-400 ml-1'>*</span>}
                    </label>
                )}
                <div className='flex gap-2 items-center'>
                    <input
                        ref={ref}
                        type={inputType||"text"}
                        className={`
                        px-3 py-2 border rounded transition-colors w-full
                        focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent
                        ${error
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-gray-300 hover:border-gray-400'
                            }
                        ${className}
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
                    <span className="text-sm text-red-600">{error}</span>
                )}

                {helperText && !error && (
                    <span className="text-sm text-gray-500">{helperText}</span>
                )}
            </div>
        );
    }
);

TextInput.displayName = 'TextInput';

export default TextInput;
