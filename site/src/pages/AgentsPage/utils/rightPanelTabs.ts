import type {
	Workspace,
	WorkspaceAgent,
	WorkspaceAgentPortShareProtocol,
} from "#/api/typesGenerated";
import {
	findWorkspaceAgent,
	findWorkspaceAppWithAgent,
} from "#/modules/apps/workspaceApps";
import type { PortTabSource } from "../components/WorkspacePillPorts";

export type UserRightPanelTab =
	| {
			id: string;
			kind: "terminal";
			label: string;
			/**
			 * UUID used as the PTY reconnect token. The backend rejects
			 * reconnect tokens that are not valid UUIDs, so each terminal tab
			 * stores its own generated UUID. Persisting it keeps the PTY
			 * session attached across reloads.
			 */
			reconnectionToken: string;
			/**
			 * Command run when the PTY session is first created. Used by command
			 * apps (e.g. Claude Code) that open as a renamed terminal tab instead
			 * of a new browser window. The backend only runs the command for a
			 * fresh reconnect token, so reattaching after a reload does not
			 * re-run it.
			 */
			initialCommand?: string;
			/**
			 * Set when the terminal was opened from a command app. Used to
			 * deduplicate so reopening the same command app activates the
			 * existing terminal tab instead of starting another session.
			 */
			sourceAppId?: string;
	  }
	| {
			id: string;
			kind: "workspace_app";
			label: string;
			appId: string;
			agentId: string;
	  }
	| {
			id: string;
			kind: "port";
			label: string;
			agentId: string;
			port: number;
			protocol: WorkspaceAgentPortShareProtocol;
			source: PortTabSource;
	  };

type ValidateUserRightPanelTabsOptions = {
	workspace: Workspace | undefined;
	workspaceAgent: WorkspaceAgent | undefined;
	wildcardHostname: string;
};

export function isUserRightPanelTab(
	value: unknown,
): value is UserRightPanelTab {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	if (typeof record.id !== "string" || typeof record.label !== "string") {
		return false;
	}

	if (record.kind === "terminal") {
		return (
			typeof record.reconnectionToken === "string" &&
			record.reconnectionToken !== "" &&
			(record.initialCommand === undefined ||
				typeof record.initialCommand === "string") &&
			(record.sourceAppId === undefined ||
				typeof record.sourceAppId === "string")
		);
	}

	if (record.kind === "workspace_app") {
		return (
			typeof record.appId === "string" && typeof record.agentId === "string"
		);
	}

	if (record.kind === "port") {
		return (
			typeof record.agentId === "string" &&
			typeof record.port === "number" &&
			Number.isInteger(record.port) &&
			record.port > 0 &&
			(record.protocol === "http" || record.protocol === "https") &&
			(record.source === "listening" || record.source === "shared")
		);
	}

	return false;
}

export function validateUserRightPanelTabs(
	tabs: readonly UserRightPanelTab[],
	{
		workspace,
		workspaceAgent,
		wildcardHostname,
	}: ValidateUserRightPanelTabsOptions,
): UserRightPanelTab[] {
	return tabs.filter((tab) => {
		if (tab.kind === "terminal") {
			return workspace !== undefined && workspaceAgent !== undefined;
		}

		if (!workspace) {
			return false;
		}

		if (tab.kind === "workspace_app") {
			return (
				findWorkspaceAppWithAgent(workspace, tab.agentId, tab.appId) !==
				undefined
			);
		}

		return (
			wildcardHostname.trim() !== "" &&
			findWorkspaceAgent(workspace, tab.agentId) !== undefined
		);
	});
}

export function areUserRightPanelTabsEqual(
	left: readonly UserRightPanelTab[],
	right: readonly UserRightPanelTab[],
): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function createUserRightPanelTabId(
	kind: UserRightPanelTab["kind"],
): string {
	return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getNextTerminalTabLabel(
	tabs: readonly UserRightPanelTab[],
): string {
	const usedNumbers = new Set<number>();
	for (const tab of tabs) {
		if (tab.kind !== "terminal") {
			continue;
		}
		const match = /^Terminal (\d+)$/.exec(tab.label);
		if (!match) {
			continue;
		}
		const value = Number(match[1]);
		if (Number.isInteger(value) && value >= 2) {
			usedNumbers.add(value);
		}
	}

	let next = 2;
	while (usedNumbers.has(next)) {
		next += 1;
	}
	return `Terminal ${next}`;
}

/**
 * Generates a UUID for use as a terminal PTY reconnect token. The backend
 * requires the reconnect token to be a valid UUID, so a random one is created
 * per terminal tab and persisted with the tab descriptor.
 */
export function createTerminalReconnectionToken(): string {
	const cryptoObject =
		typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
	if (cryptoObject?.randomUUID) {
		return cryptoObject.randomUUID();
	}

	// Fallback for environments without crypto.randomUUID (e.g. insecure
	// contexts). Produces a RFC 4122 version 4 UUID string.
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const random =
			cryptoObject?.getRandomValues?.(new Uint8Array(1))[0] ??
			Math.floor(Math.random() * 256);
		const nibble = random % 16;
		const value = char === "x" ? nibble : (nibble & 0x3) | 0x8;
		return value.toString(16);
	});
}
