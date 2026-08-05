'use client';

type BtnType = "submit" | "reset" | "button"

const HeaderBtn = ({ onClick, text, className, type }: { onClick?: () => void, text: string, className?: string, type?: BtnType }) => {
    return (
        <button
            type={type || "button"}
            className={className ?? "text-center bg-bgBtn text-background w-fit p-2 font-medium text-xs hover:bg-bgBtn/70"}
            onClick={onClick}>
            {text}
        </button>
    );
};

export default HeaderBtn;
