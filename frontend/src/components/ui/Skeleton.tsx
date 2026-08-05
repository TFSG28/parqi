import React from 'react';

interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    animation?: 'pulse' | 'wave' | false;
    width?: number | string;
    height?: number | string;
    className?: string;
    children?: React.ReactNode;
}

const waveKeyframes = `
    @keyframes skeletonWave {
        0% {
            transform: translateX(-100%);
        }
        50% {
            transform: translateX(100%);
        }
        100% {
            transform: translateX(100%);
        }
    }
`;

let styleInjected = false;

const injectWaveAnimation = () => {
    if (typeof document !== 'undefined' && !styleInjected) {
        const style = document.createElement('style');
        style.textContent = waveKeyframes;
        document.head.appendChild(style);
        styleInjected = true;
    }
};

export const Skeleton = ({
    variant = 'text',
    animation = 'wave',
    width,
    height,
    className = '',
    children
}: SkeletonProps) => {
    const getVariantClasses = () => {
        switch (variant) {
            case 'text':
                return 'rounded';
            case 'circular':
                return 'rounded-full';
            case 'rectangular':
                return '';
            case 'rounded':
                return 'rounded-lg';
            default:
                return 'rounded';
        }
    };

    const getDimensions = () => {
        const styles: React.CSSProperties = {};

        if (children) {
            return styles;
        }

        if (width) {
            styles.width = typeof width === 'number' ? `${width}px` : width;
        }

        if (height) {
            styles.height = typeof height === 'number' ? `${height}px` : height;
        } else if (variant === 'text') {
            styles.height = '1em';
        }

        return styles;
    };

    if (children) {
        return (
            <span className={`inline-block ${className}`} style={getDimensions()}>
                {children}
            </span>
        );
    }

    const baseClasses = `inline-block bg-gray-300 ${getVariantClasses()} ${className}`;

    if (animation === 'pulse') {
        return (
            <span className={`${baseClasses} animate-pulse`} style={getDimensions()} />
        );
    }

    if (animation === 'wave') {
        injectWaveAnimation();
        return (
            <span className={`${baseClasses} relative overflow-hidden`} style={getDimensions()}>
                <span
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                        animation: 'skeletonWave 1.6s linear 0.5s infinite'
                    }}
                />
            </span>
        );
    }

    return <span className={baseClasses} style={getDimensions()} />;
};

export default Skeleton;
