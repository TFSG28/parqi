import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading: boolean;
    threshold?: number;
}

/**
 * Returns a ref to attach to a sentinel element at the end of a list.
 * When the sentinel scrolls into view (and there is more to load and no load
 * is in flight), `onLoadMore` is called.
 *
 *   const sentinelRef = useInfiniteScroll({ onLoadMore, hasMore, isLoading });
 *   return <><List /> <div ref={sentinelRef} /></>;
 */
export const useInfiniteScroll = ({
    onLoadMore,
    hasMore,
    isLoading,
    threshold = 300,
}: UseInfiniteScrollOptions) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [target] = entries;
            if (target.isIntersecting && hasMore && !isLoading) {
                onLoadMore();
            }
        },
        [hasMore, isLoading, onLoadMore]
    );

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: `${threshold}px`,
            threshold: 0.1,
        };

        observerRef.current = new IntersectionObserver(handleObserver, options);

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observerRef.current.observe(currentSentinel);
        }

        return () => {
            if (observerRef.current && currentSentinel) {
                observerRef.current.unobserve(currentSentinel);
            }
        };
    }, [handleObserver, threshold]);

    return sentinelRef;
};
