import {
	ChevronDownIcon,
	LayoutGridIcon,
	PlusIcon,
	SquareTerminalIcon,
} from "lucide-react";
import { type FC, useState } from "react";
import type {
	Workspace,
	WorkspaceAgent,
	WorkspaceApp,
} from "#/api/typesGenerated";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/DropdownMenu/DropdownMenu";
import { ExternalImage } from "#/components/ExternalImage/ExternalImage";
import { useProxy } from "#/contexts/ProxyContext";
import { isWorkspaceAppEmbeddable } from "#/modules/apps/workspaceApps";
import { AppLink } from "#/modules/resources/AppLink/AppLink";
import { cn } from "#/utils/cn";
import {
	canShowPortsMenu,
	type PortSelection,
	PortsMenuItem,
	usePortsData,
} from "../WorkspacePillPorts";

const noop = () => {};

/**
 * Ports submenu for the add-tab control. Fetches port data only while the menu
 * is open and reuses the shared WorkspacePillPorts menu item, configured to
 * create a port preview tab instead of opening the port in a new browser tab.
 */
const AgentPortsSubMenu: FC<{
	workspace: Workspace;
	agent: WorkspaceAgent;
	host: string;
	isOpen: boolean;
	isRunning: boolean;
	onPortSelect: (selection: PortSelection) => void;
}> = ({ workspace, agent, host, isOpen, isRunning, onPortSelect }) => {
	const portsData = usePortsData(
		workspace,
		agent,
		isOpen && agent.status === "connected",
	);
	return (
		<PortsMenuItem
			workspace={workspace}
			agent={agent}
			host={host}
			portsData={portsData}
			isRunning={isRunning}
			isBelowMd={false}
			focusOnMount={false}
			onFocusApplied={noop}
			onSelectInline={noop}
			onPortSelect={onPortSelect}
		/>
	);
};

export const RightPanelAddTabMenu: FC<{
	workspace: Workspace | undefined;
	agent: WorkspaceAgent | undefined;
	isRunning: boolean;
	onNewTerminal: () => void;
	onOpenWorkspaceApp: (app: WorkspaceApp) => void;
	onOpenCommandApp: (app: WorkspaceApp) => void;
	onOpenPort: (selection: PortSelection) => void;
}> = ({
	workspace,
	agent,
	isRunning,
	onNewTerminal,
	onOpenWorkspaceApp,
	onOpenCommandApp,
	onOpenPort,
}) => {
	const [open, setOpen] = useState(false);
	const { proxy } = useProxy();
	const host = proxy.preferredWildcardHostname;
	const userApps = agent?.apps.filter((app) => !app.hidden) ?? [];
	const canCreateTerminal = workspace !== undefined && agent !== undefined;
	const canShowPorts =
		workspace !== undefined &&
		agent !== undefined &&
		canShowPortsMenu(agent, host);

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

					{workspace && agent && userApps.length > 0 && (
						<>
							<DropdownMenuSeparator className="my-1" />
							{userApps.map((app) => {
								// Command apps (e.g. Claude Code) open as a renamed
								// terminal tab running the app's command, rather than
								// in a new browser window.
								if (app.command) {
									return (
										<DropdownMenuItem
											key={app.id}
											onSelect={() => onOpenCommandApp(app)}
											disabled={!isRunning}
										>
											{app.icon ? (
												<ExternalImage
													src={app.icon}
													alt=""
													className="rounded-sm"
												/>
											) : (
												<SquareTerminalIcon />
											)}
											{app.display_name ?? app.slug}
										</DropdownMenuItem>
									);
								}
								if (isWorkspaceAppEmbeddable(app)) {
									return (
										<DropdownMenuItem
											key={app.id}
											onSelect={() => onOpenWorkspaceApp(app)}
											disabled={!isRunning}
										>
											{app.icon ? (
												<ExternalImage
													src={app.icon}
													alt=""
													className="rounded-sm"
												/>
											) : (
												<LayoutGridIcon />
											)}
											{app.display_name ?? app.slug}
										</DropdownMenuItem>
									);
								}
								return (
									<AppLink
										key={app.id}
										workspace={workspace}
										agent={agent}
										app={app}
										grouped
									/>
								);
							})}
						</>
					)}

					{workspace && agent && canShowPorts && (
						<>
							<DropdownMenuSeparator className="my-1" />
							<AgentPortsSubMenu
								workspace={workspace}
								agent={agent}
								host={host}
								isOpen={open}
								isRunning={isRunning}
								onPortSelect={onOpenPort}
							/>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};
