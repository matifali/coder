import {
	ArrowLeftIcon,
	BuildingIcon,
	ChevronRightIcon,
	ExternalLinkIcon,
	LockIcon,
	LockOpenIcon,
	NetworkIcon,
	RadioIcon,
} from "lucide-react";
import type { FC } from "react";
import { useEffect, useRef } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router";
import { API } from "#/api/api";
import { workspacePortShares } from "#/api/queries/workspaceportsharing";
import type {
	Workspace,
	WorkspaceAgent,
	WorkspaceAgentListeningPort,
	WorkspaceAgentPortShare,
	WorkspaceAgentPortShareProtocol,
} from "#/api/typesGenerated";
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "#/components/DropdownMenu/DropdownMenu";
import {
	getWorkspaceListeningPortsProtocol,
	portForwardURL,
} from "#/utils/portForward";

/**
 * Source of a port preview tab. Listening ports come from the agent's detected
 * open ports; shared ports come from configured port shares.
 */
export type PortTabSource = "listening" | "shared";

/**
 * A port chosen from the ports menu. The right-panel add-tab control turns this
 * into a port preview tab instead of opening the port in a new browser tab.
 */
export type PortSelection = {
	label: string;
	port: number;
	protocol: WorkspaceAgentPortShareProtocol;
	source: PortTabSource;
};

/**
 * Whether the ports menu can be shown for an agent. Requires a configured
 * wildcard access URL (host) and the agent's port-forwarding helper.
 */
export function canShowPortsMenu(agent: WorkspaceAgent, host: string): boolean {
	return host !== "" && agent.display_apps.includes("port_forwarding_helper");
}

interface PortsData {
	listeningPorts: readonly WorkspaceAgentListeningPort[] | undefined;
	sharedPorts: readonly WorkspaceAgentPortShare[] | undefined;
	privateListeningPorts: readonly WorkspaceAgentListeningPort[];
	totalCount: number | undefined;
	protocol: "http" | "https";
}

export const usePortsData = (
	workspace: Workspace,
	agent: WorkspaceAgent,
	enabled: boolean,
): PortsData => {
	const protocol = getWorkspaceListeningPortsProtocol(workspace.id);

	const { data: listeningPorts } = useQuery({
		queryKey: ["portForward", agent.id],
		queryFn: () => API.getAgentListeningPorts(agent.id),
		enabled,
		refetchInterval: enabled ? 5_000 : false,
		staleTime: 0,
		select: (res) => res.ports,
	});

	const { data: sharedPorts } = useQuery({
		...workspacePortShares(workspace.id),
		enabled,
		staleTime: 0,
		select: (res) => res.shares.filter((s) => s.agent_name === agent.name),
	});

	// Listening ports that haven't been explicitly shared appear in their own
	// section; shared ports bubble up to the "Shared" section.
	const sharedPortNumbers = new Set((sharedPorts ?? []).map((s) => s.port));
	const privateListeningPorts = (listeningPorts ?? []).filter(
		(p) => !sharedPortNumbers.has(p.port),
	);

	const totalCount =
		listeningPorts !== undefined ? listeningPorts.length : undefined;

	return {
		listeningPorts,
		sharedPorts,
		privateListeningPorts,
		totalCount,
		protocol,
	};
};

export const PortsMenuItem: FC<{
	workspace: Workspace;
	agent: WorkspaceAgent;
	host: string;
	portsData: PortsData;
	isRunning: boolean;
	isBelowMd: boolean;
	focusOnMount: boolean;
	onFocusApplied: () => void;
	onSelectInline: () => void;
	/**
	 * When set, selecting a port calls this instead of opening the port in a new
	 * browser tab. Used by the right-panel add-tab control to create a port
	 * preview tab.
	 */
	onPortSelect?: (selection: PortSelection) => void;
}> = ({
	workspace,
	agent,
	host,
	portsData,
	isRunning,
	isBelowMd,
	focusOnMount,
	onFocusApplied,
	onSelectInline,
	onPortSelect,
}) => {
	const itemRef = useRef<HTMLDivElement>(null);

	const label =
		portsData.totalCount !== undefined
			? `Ports (${portsData.totalCount})`
			: "Ports";

	useEffect(() => {
		if (!focusOnMount || !isBelowMd) {
			return;
		}
		itemRef.current?.focus();
		onFocusApplied();
	}, [focusOnMount, isBelowMd, onFocusApplied]);

	if (isBelowMd) {
		return (
			<DropdownMenuItem
				ref={itemRef}
				disabled={!isRunning}
				onSelect={(event) => {
					event.preventDefault();
					onSelectInline();
				}}
			>
				<NetworkIcon className="size-3.5" />
				{label}
				<ChevronRightIcon className="ml-auto size-3.5" />
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger disabled={!isRunning}>
				<NetworkIcon className="size-3.5" />
				{label}
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent className="w-56 p-1 [&_[role=menuitem]]:text-xs [&_[role=menuitem]]:py-1 [&_svg]:!size-3.5">
				<PortsList
					host={host}
					agent={agent}
					workspace={workspace}
					data={portsData}
					onPortSelect={onPortSelect}
				/>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
};

export const MobilePortsPanel: FC<{
	workspace: Workspace;
	agent: WorkspaceAgent;
	host: string;
	portsData: PortsData;
	onBack: () => void;
}> = ({ workspace, agent, host, portsData, onBack }) => {
	const backRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		backRef.current?.focus();
	}, []);

	return (
		<>
			<DropdownMenuItem
				ref={backRef}
				onSelect={(event) => {
					event.preventDefault();
					onBack();
				}}
			>
				<ArrowLeftIcon className="size-3.5" />
				Back
			</DropdownMenuItem>
			<DropdownMenuSeparator className="my-1" />
			<PortsList
				host={host}
				agent={agent}
				workspace={workspace}
				data={portsData}
			/>
		</>
	);
};

const PortsList: FC<{
	host: string;
	agent: WorkspaceAgent;
	workspace: Workspace;
	data: PortsData;
	onPortSelect?: (selection: PortSelection) => void;
}> = ({ host, agent, workspace, data, onPortSelect }) => {
	const route = `/@${workspace.owner_name}/${workspace.name}`;
	const { listeningPorts, sharedPorts, privateListeningPorts, protocol } = data;

	return (
		<>
			{privateListeningPorts.length > 0 && (
				<div className="px-2 pb-1.5 pt-1">
					<span className="text-xs font-semibold text-content-secondary">
						Listening Ports
					</span>
				</div>
			)}

			{privateListeningPorts.map((port) => (
				<ListeningPortItem
					key={port.port}
					port={port}
					host={host}
					agentName={agent.name}
					workspaceName={workspace.name}
					ownerName={workspace.owner_name}
					protocol={protocol}
					onPortSelect={onPortSelect}
				/>
			))}

			{listeningPorts !== undefined &&
				sharedPorts !== undefined &&
				privateListeningPorts.length === 0 &&
				sharedPorts.length === 0 && (
					<p className="px-2 py-2 text-center text-xs text-content-tertiary">
						No open ports detected.
					</p>
				)}

			{(sharedPorts ?? []).length > 0 && (
				<>
					<DropdownMenuSeparator className="my-1" />
					<div className="px-2 pb-1.5 pt-1">
						<span className="text-xs font-semibold text-content-secondary">
							Shared Ports
						</span>
					</div>
					{(sharedPorts ?? []).map((share) => (
						<SharedPortItem
							key={share.port}
							share={share}
							host={host}
							agentName={agent.name}
							workspaceName={workspace.name}
							ownerName={workspace.owner_name}
							onPortSelect={onPortSelect}
						/>
					))}
				</>
			)}

			<DropdownMenuSeparator className="my-1" />
			<DropdownMenuItem asChild>
				<Link to={route} target="_blank" rel="noreferrer">
					<ExternalLinkIcon className="size-3.5" />
					Manage sharing
				</Link>
			</DropdownMenuItem>
		</>
	);
};

const ListeningPortItem: FC<{
	port: WorkspaceAgentListeningPort;
	host: string;
	agentName: string;
	workspaceName: string;
	ownerName: string;
	protocol: "http" | "https";
	onPortSelect?: (selection: PortSelection) => void;
}> = ({
	port,
	host,
	agentName,
	workspaceName,
	ownerName,
	protocol,
	onPortSelect,
}) => {
	const url = portForwardURL(
		host,
		port.port,
		agentName,
		workspaceName,
		ownerName,
		protocol,
	);
	const selection: PortSelection = {
		label: `Port ${port.port}`,
		port: port.port,
		protocol,
		source: "listening",
	};

	if (onPortSelect) {
		return (
			<DropdownMenuItem onSelect={() => onPortSelect(selection)}>
				<RadioIcon className="size-3.5 shrink-0" />
				<span className="font-mono tabular-nums">{port.port}</span>
				{port.process_name !== "" && (
					<span className="truncate text-content-tertiary">
						{port.process_name}
					</span>
				)}
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuItem asChild>
			<a href={url} target="_blank" rel="noreferrer">
				<RadioIcon className="size-3.5 shrink-0" />
				<span className="font-mono tabular-nums">{port.port}</span>
				{port.process_name !== "" && (
					<span className="truncate text-content-tertiary">
						{port.process_name}
					</span>
				)}
				<ExternalLinkIcon className="ml-auto size-3.5 shrink-0 opacity-50" />
			</a>
		</DropdownMenuItem>
	);
};

const SharedPortItem: FC<{
	share: WorkspaceAgentPortShare;
	host: string;
	agentName: string;
	workspaceName: string;
	ownerName: string;
	onPortSelect?: (selection: PortSelection) => void;
}> = ({ share, host, agentName, workspaceName, ownerName, onPortSelect }) => {
	const url = portForwardURL(
		host,
		share.port,
		agentName,
		workspaceName,
		ownerName,
		share.protocol,
	);
	const ShareIcon =
		share.share_level === "public"
			? LockOpenIcon
			: share.share_level === "organization"
				? BuildingIcon
				: LockIcon;
	const selection: PortSelection = {
		label: `Port ${share.port}`,
		port: share.port,
		protocol: share.protocol,
		source: "shared",
	};

	if (onPortSelect) {
		return (
			<DropdownMenuItem onSelect={() => onPortSelect(selection)}>
				<ShareIcon className="size-3.5 shrink-0" />
				<span className="font-mono tabular-nums">{share.port}</span>
				<span className="truncate capitalize text-content-tertiary">
					{share.share_level}
				</span>
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuItem asChild>
			<a href={url} target="_blank" rel="noreferrer">
				<ShareIcon className="size-3.5 shrink-0" />
				<span className="font-mono tabular-nums">{share.port}</span>
				<span className="truncate capitalize text-content-tertiary">
					{share.share_level}
				</span>
				<ExternalLinkIcon className="ml-auto size-3.5 shrink-0 opacity-50" />
			</a>
		</DropdownMenuItem>
	);
};
