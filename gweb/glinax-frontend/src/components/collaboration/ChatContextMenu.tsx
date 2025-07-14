'use client';

import { FC } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

type ChatContextMenuProps = {
  chatId: number;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
  disabled?: boolean;
};

const ChatContextMenu: FC<ChatContextMenuProps> = ({
  onRename,
  onDelete,
  onShare,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-muted rounded-full transition">
          <MoreVertical className="w-5 h-5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-44" align="end" sideOffset={8}>
        <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>Share</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatContextMenu;
