import { v4 as uuidv4 } from "uuid";

const terminalReconnectionTokenPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UserRightPanelTab = {
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
			terminalReconnectionTokenPattern.test(record.reconnectionToken)
		);
	}

	return false;
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
	return uuidv4();
}
