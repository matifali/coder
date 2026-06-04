import {
	type FC,
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import { useQuery } from "react-query";
import { deploymentConfig } from "#/api/queries/deployment";
import { appearanceSettings } from "#/api/queries/users";
import { workspaceUsage } from "#/api/queries/workspaces";
import type * as TypesGen from "#/api/typesGenerated";
import { useProxy } from "#/contexts/ProxyContext";
import { useEmbeddedMetadata } from "#/hooks/useEmbeddedMetadata";
import { getTerminalConfig } from "#/modules/terminal/terminalConfig";
import type { ConnectionStatus } from "#/modules/terminal/types";
import {
	WorkspaceTerminal,
	type WorkspaceTerminalHandle,
} from "#/modules/terminal/WorkspaceTerminal";
import { WorkspaceTerminalAlerts } from "#/modules/terminal/WorkspaceTerminalAlerts";
import { openMaybePortForwardedURL } from "#/utils/portForward";

/**
 * Safety ceiling for signalling readiness. A freshly created terminal tab is
 * activated by the parent once its first output paints, but a silent connection
 * must still be promoted eventually so the new tab never stays unreachable.
 */
const READY_FALLBACK_MS = 5000;

interface TerminalPanelProps {
	chatId: string;
	/** Used as the reconnection token so the PTY session survives navigation and page reloads. */
	reconnectionToken?: string;
	/** Command run when the PTY session is first created (e.g. a command app). */
	initialCommand?: string;
	/** Whether the terminal should connect and render (active or connecting). */
	isVisible?: boolean;
	/**
	 * Whether the terminal should grab keyboard focus. Gate this on the tab being
	 * the active tab, not merely connecting, so a terminal connecting off screen
	 * does not steal focus and focus moves to it once it is promoted to active.
	 */
	autoFocus?: boolean;
	/**
	 * Fires once the terminal is ready to be shown: the first output has
	 * painted, the connection dropped, or a fallback timeout elapsed. The
	 * parent uses this to defer activating a freshly created terminal tab
	 * until its prompt is on screen, avoiding a flash of an empty panel.
	 */
	onReady?: () => void;
	workspace?: TypesGen.Workspace;
	workspaceAgent?: TypesGen.WorkspaceAgent;
}

export const TerminalPanel: FC<TerminalPanelProps> = ({
	chatId,
	reconnectionToken = chatId,
	initialCommand,
	isVisible,
	autoFocus = true,
	onReady,
	workspace,
	workspaceAgent,
}) => {
	const { proxy } = useProxy();
	const { metadata } = useEmbeddedMetadata();
	const terminalRef = useRef<WorkspaceTerminalHandle>(null);
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>("initializing");
	// A freshly created terminal tab connects off screen while the previous tab
	// stays visible. Notify the parent exactly once it is ready to be shown so it
	// can promote this tab to active, avoiding a flash of an empty panel. The
	// first caller wins: painted output, a dropped connection, or the fallback
	// timeout for a silent connection.
	const hasSignaledReadyRef = useRef(false);
	const signalReady = useEffectEvent(() => {
		if (hasSignaledReadyRef.current) {
			return;
		}
		hasSignaledReadyRef.current = true;
		onReady?.();
	});
	const handleStatusChange = useCallback((status: ConnectionStatus) => {
		setConnectionStatus(status);
		// A dropped connection produces no output, so signal readiness to surface
		// the terminal alerts instead of waiting on the fallback timer.
		if (status === "disconnected") {
			signalReady();
		}
	}, []);
	useEffect(() => {
		const timer = setTimeout(signalReady, READY_FALLBACK_MS);
		return () => clearTimeout(timer);
	}, []);
	const config = useQuery(deploymentConfig());
	const appearanceSettingsQuery = useQuery(
		appearanceSettings(metadata.userAppearance),
	);
	const terminalConfig = getTerminalConfig(
		config.data,
		appearanceSettingsQuery.data,
		proxy.preferredPathAppURL,
	);

	useQuery(
		workspaceUsage({
			usageApp: "reconnecting-pty",
			connectionStatus,
			workspaceId: workspace?.id,
			agentId: workspaceAgent?.id,
		}),
	);

	const handleOpenLink = (uri: string) => {
		openMaybePortForwardedURL(
			uri,
			proxy.preferredWildcardHostname,
			workspaceAgent?.name,
			workspace?.name,
			workspace?.owner_name,
		);
	};

	const handleTerminalError = (error: Error) => {
		console.error("WebSocket failed:", error);
	};

	const handleAlertChange = () => {
		terminalRef.current?.refit();
	};

	if (!workspaceAgent) {
		return (
			<div className="flex h-full min-h-0 flex-col">
				<div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs text-content-secondary">
					Terminal will be available once the workspace agent is ready.
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<WorkspaceTerminalAlerts
				agent={workspaceAgent}
				status={connectionStatus}
				onAlertChange={handleAlertChange}
			/>
			<div className="min-h-0 flex-1">
				<WorkspaceTerminal
					ref={terminalRef}
					agentId={workspaceAgent.id}
					operatingSystem={workspaceAgent.operating_system}
					isVisible={isVisible}
					autoFocus={autoFocus}
					onStatusChange={handleStatusChange}
					onContentReady={() => signalReady()}
					onError={handleTerminalError}
					reconnectionToken={reconnectionToken}
					initialCommand={initialCommand}
					baseUrl={terminalConfig.baseUrl}
					terminalFontFamily={terminalConfig.fontFamily}
					renderer={terminalConfig.renderer}
					onOpenLink={handleOpenLink}
					loading={config.isLoading || appearanceSettingsQuery.isLoading}
					testId="agents-sidebar-terminal"
				/>
			</div>
		</div>
	);
};
