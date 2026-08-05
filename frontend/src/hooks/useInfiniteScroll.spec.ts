import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInfiniteScroll } from './useInfiniteScroll';

// Capture the IntersectionObserver callback so we can drive it manually.
let observerCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;

beforeEach(() => {
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
                observerCallback = cb;
            }
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
});

describe('useInfiniteScroll', () => {
    it('calls onLoadMore when the sentinel intersects, has more, and is not loading', () => {
        const onLoadMore = vi.fn();
        renderHook(() => useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false }));

        observerCallback([{ isIntersecting: true }]);

        expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('does not call onLoadMore while loading', () => {
        const onLoadMore = vi.fn();
        renderHook(() => useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: true }));

        observerCallback([{ isIntersecting: true }]);

        expect(onLoadMore).not.toHaveBeenCalled();
    });

    it('does not call onLoadMore when there is nothing more to load', () => {
        const onLoadMore = vi.fn();
        renderHook(() => useInfiniteScroll({ onLoadMore, hasMore: false, isLoading: false }));

        observerCallback([{ isIntersecting: true }]);

        expect(onLoadMore).not.toHaveBeenCalled();
    });

    it('does not call onLoadMore when the sentinel is not intersecting', () => {
        const onLoadMore = vi.fn();
        renderHook(() => useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false }));

        observerCallback([{ isIntersecting: false }]);

        expect(onLoadMore).not.toHaveBeenCalled();
    });
});
