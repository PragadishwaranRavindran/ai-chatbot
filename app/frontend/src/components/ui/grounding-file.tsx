import { File } from "lucide-react";

import { Button } from "./button";

import { GroundingFile as GroundingFileType } from "@/types";

type Properties = {
    value: GroundingFileType;
    onClick: () => void;
};

export default function GroundingFile({ value, onClick }: Properties) {
    return (
        <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full px-3 py-1 text-xs max-w-[200px] truncate" 
            onClick={onClick}
        >
            <File className="mr-1 h-3 w-3 flex-shrink-0" />
            <span className="truncate">{value.name}</span>
        </Button>
    );
}
