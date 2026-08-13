const Loading = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/20">
            <div className="flex flex-col items-center gap-5 p-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg">
                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-mist border-t-brand"></div>
                <span className="text-sm text-ink-soft">A carregar...</span>
            </div>
        </div>
    )
}

export default Loading
