'use client';

import { ReactNode } from "react";
import CloseBtn from "./CloseBtn";

const Modal = ({ children, className, onClose }: { children: ReactNode, className?: string, onClose?: () => void }) => {
    return (
        <div className={`fixed inset-0 bg-ink/40 flex flex-col items-center justify-center z-10 ${className ?? ''}`}>
            <div className="p-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] max-h-[90vh] overflow-y-auto shadow-lg">
                {
                    onClose &&
                    <div className="flex w-full justify-start mb-10">
                        <CloseBtn onClose={onClose} />
                    </div>
                }
                {children}
            </div>
        </div>
    );
};

export default Modal;
