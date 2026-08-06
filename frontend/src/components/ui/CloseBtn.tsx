'use client';

import { IoIosClose } from "react-icons/io";
import Tooltip from "../feature/Tooltip";

type Position = "left" | "right"

const CloseBtn = ({ onClose, size, position }: { onClose: () => void, size?: number, position?: Position }) => {
    return (
        <button onClick={onClose} className="text-ink-soft hover:text-ink transition-colors">
            <Tooltip text="Fechar" position={position}>
                <IoIosClose size={size || 30} />
            </Tooltip>
        </button>
    );
};

export default CloseBtn;
