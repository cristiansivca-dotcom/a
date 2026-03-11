'use client';

import React, { useState, useRef, useCallback } from 'react';
import { formatBs } from '@/lib/utils/currency';

interface CurrencyInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
    disabled?: boolean;
    suffix?: string;
    decimals?: number;
    id?: string;
}

function parseInput(raw: string, decimals: number): number {
    if (!raw) return 0;
    // Support both "1.234,56" and "1234.56" and "1234,56"
    const withDot = raw.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(withDot) || 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Bank-style currency input — Venezuelan format:
 *   dot  = thousands separator  → 1.234.567
 *   comma = decimal separator   → 1.234.567,89
 *
 * While focused: shows raw input so user can type freely.
 * On blur: formats and fires onChange with numeric value.
 */
export default function CurrencyInput({
    value,
    onChange,
    className = '',
    placeholder = '0,00',
    readOnly = false,
    disabled = false,
    suffix,
    decimals = 2,
    id,
}: CurrencyInputProps) {
    const [rawValue, setRawValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Show formatted when blurred, raw when focused
    const displayValue = isFocused ? rawValue : (value ? formatBs(value, decimals) : '');

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        setRawValue(value ? String(value) : '');
        setTimeout(() => inputRef.current?.select(), 0);
    }, [value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow digits, comma, dot only
        setRawValue(e.target.value.replace(/[^0-9.,]/g, ''));
    }, []);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        const numeric = parseInput(rawValue, decimals);
        onChange(numeric);
    }, [rawValue, decimals, onChange]);

    const inputCls = `w-full border border-white/10 rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-mono font-bold text-right bg-white/5 ${disabled || readOnly ? 'cursor-not-allowed opacity-70' : ''} ${className}`;

    const inputEl = (
        <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            readOnly={readOnly}
            disabled={disabled}
            className={suffix ? `${inputCls} pr-14` : inputCls}
        />
    );

    if (suffix) {
        return (
            <div className="relative">
                {inputEl}
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm pointer-events-none select-none">
                    {suffix}
                </span>
            </div>
        );
    }

    return inputEl;
}

/**
 * Compact inline variant for table cells.
 */
export function CurrencyInputInline({
    value,
    onChange,
    className = '',
    decimals = 2,
}: {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    decimals?: number;
}) {
    const [rawValue, setRawValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const displayValue = isFocused ? rawValue : (value ? formatBs(value, decimals) : '');

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        setRawValue(value ? String(value) : '');
        setTimeout(() => inputRef.current?.select(), 0);
    }, [value]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        const numeric = parseInput(rawValue, decimals);
        onChange(numeric);
    }, [rawValue, decimals, onChange]);

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={(e) => setRawValue(e.target.value.replace(/[^0-9.,]/g, ''))}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="0,00"
            className={`bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-blue-500/50 transition-all font-mono text-right w-full ${className}`}
        />
    );
}

export { formatBs };
