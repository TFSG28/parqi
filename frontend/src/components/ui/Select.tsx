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
                    <label className="text-sm font-medium text-ink">
                        {label}{required && <span className='text-muted ml-1'>*</span>}
                    </label>
                )}
                <select
                    ref={ref}
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
                    <span className="text-sm text-danger">{error}</span>
                )}

                {helperText && !error && (
                    <span className="text-sm text-muted">{helperText}</span>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
