'use client';

type BtnType = "submit" | "reset" | "button"

const HeaderBtn = ({ onClick, text, className, type }: { onClick?: () => void, text: string, className?: string, type?: BtnType }) => {
    return (
        <button
            type={type || "button"}
            className={className ?? "text-center bg-brand text-white w-fit px-3 py-2 rounded-md font-medium text-xs hover:brightness-110 active:brightness-90 transition-[filter]"}
            onClick={onClick}>
            {text}
        </button>
    );
};

export default HeaderBtn;
