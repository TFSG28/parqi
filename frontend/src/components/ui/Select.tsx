'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';

interface SelectOption {
    value: string;
    text: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options: SelectOption[];
    placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, helperText, className, required, options, placeholder, defaultValue, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1 w-full">
                {label && (
                    <label className="text-sm font-medium text-gray-700">
                        {label}{required && <span className='text-gray-400 ml-1'>*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    className={`
                        px-3 py-2 border rounded transition-colors w-full bg-background
                        focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent
                        ${error
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 hover:border-gray-400'
                        }
                        ${className}
                    `}
                    defaultValue={placeholder ? "" : defaultValue}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.text}
                        </option>
                    ))}
                </select>

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

Select.displayName = 'Select';

export default Select;
