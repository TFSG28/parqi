'use client';

import { ReactNode } from "react";
import CloseBtn from "./CloseBtn";

const Modal = ({ children, className, onClose }: { children: ReactNode, className?: string, onClose?: () => void }) => {
    return (
        <div className={`fixed inset-0 bg-white/30 backdrop-blur-md flex flex-col items-center justify-center z-10 ${className}`}>
            <div className="p-5 border bg-background max-h-[90vh] overflow-y-auto">
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
