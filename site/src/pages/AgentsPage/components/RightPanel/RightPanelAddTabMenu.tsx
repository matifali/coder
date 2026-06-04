import { ChevronDownIcon, PlusIcon, SquareTerminalIcon } from "lucide-react";
import { type FC, useState } from "react";
import type { Workspace, WorkspaceAgent } from "#/api/typesGenerated";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/DropdownMenu/DropdownMenu";
import { cn } from "#/utils/cn";

export const RightPanelAddTabMenu: FC<{
	workspace: Workspace | undefined;
	agent: WorkspaceAgent | undefined;
	onNewTerminal: () => void;
}> = ({ workspace, agent, onNewTerminal }) => {
	const [open, setOpen] = useState(false);
	const canCreateTerminal = workspace !== undefined && agent !== undefined;

	return (
		<div className="flex h-6 shrink-0 items-center overflow-hidden rounded-md border border-solid border-border-default bg-surface-primary text-content-secondary">
			<button
				type="button"
				onClick={onNewTerminal}
				disabled={!canCreateTerminal}
				aria-label="New terminal tab"
				title="New terminal tab"
				className="flex h-full cursor-pointer items-center justify-center border-0 border-r border-solid border-border-default bg-transparent px-1.5 hover:bg-surface-secondary hover:text-content-primary disabled:pointer-events-none disabled:text-content-disabled"
			>
				<PlusIcon className="size-3.5" />
			</button>
			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Add panel"
						className="flex h-full cursor-pointer items-center justify-center border-0 bg-transparent px-1 hover:bg-surface-secondary hover:text-content-primary"
					>
						<ChevronDownIcon
							className={cn(
								"size-3 transition-transform",
								open && "rotate-180",
							)}
						/>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					side="bottom"
					className="w-52 p-1 [&_[role=menuitem]]:py-1 [&_[role=menuitem]]:text-xs [&_img]:!size-3.5 [&_svg]:!size-3.5"
				>
					<DropdownMenuItem
						onSelect={onNewTerminal}
						disabled={!canCreateTerminal}
					>
						<SquareTerminalIcon />
						New Terminal
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};
