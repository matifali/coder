import { beforeEach, describe, expect, it } from "vitest";
import {
	clearPersistedRightPanelState,
	getPersistedDefaultTerminalHidden,
	getPersistedRightPanelTabs,
	rightPanelTabStorageKeyPrefix,
	savePersistedDefaultTerminalHidden,
	savePersistedRightPanelTabs,
} from "./rightPanelTabStorage";
import {
	createTerminalReconnectionToken,
	getNextTerminalTabLabel,
	type UserRightPanelTab,
} from "./rightPanelTabs";

const terminalTab = (
	overrides: Partial<UserRightPanelTab> = {},
): UserRightPanelTab => ({
	id: "terminal-2",
	kind: "terminal",
	label: "Terminal 2",
	reconnectionToken: "11111111-1111-4111-8111-111111111111",
	...overrides,
});

describe("terminal tab helpers", () => {
	it("starts additional terminal labels at Terminal 2", () => {
		expect(getNextTerminalTabLabel([])).toBe("Terminal 2");
	});

	it("uses the first missing terminal number", () => {
		expect(
			getNextTerminalTabLabel([
				terminalTab(),
				terminalTab({
					id: "terminal-4",
					label: "Terminal 4",
					reconnectionToken: "22222222-2222-4222-8222-222222222222",
				}),
			]),
		).toBe("Terminal 3");
	});

	it("ignores labels that are not additional terminal numbers", () => {
		expect(
			getNextTerminalTabLabel([
				terminalTab({ id: "terminal", label: "Terminal" }),
				terminalTab({ id: "terminal-1", label: "Terminal 1" }),
				terminalTab({ id: "terminal-word", label: "Terminal word" }),
				terminalTab({ id: "custom", label: "Custom Terminal 2" }),
			]),
		).toBe("Terminal 2");
	});

	it("creates UUID-formatted reconnect tokens", () => {
		const token = createTerminalReconnectionToken();
		expect(token).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
	});
});

describe("right-panel tab storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("persists tabs per chat", () => {
		const tabs: UserRightPanelTab[] = [terminalTab()];

		savePersistedRightPanelTabs("chat-1", tabs);

		expect(getPersistedRightPanelTabs("chat-1")).toEqual(tabs);
		expect(getPersistedRightPanelTabs("chat-2")).toEqual([]);
	});

	it("clears all persisted right-panel state for a chat", () => {
		const tabs: UserRightPanelTab[] = [terminalTab()];

		savePersistedRightPanelTabs("chat-1", tabs);
		savePersistedDefaultTerminalHidden("chat-1", true);
		savePersistedRightPanelTabs("chat-2", tabs);
		savePersistedDefaultTerminalHidden("chat-2", true);

		clearPersistedRightPanelState("chat-1");

		expect(getPersistedRightPanelTabs("chat-1")).toEqual([]);
		expect(getPersistedDefaultTerminalHidden("chat-1")).toBe(false);
		expect(getPersistedRightPanelTabs("chat-2")).toEqual(tabs);
		expect(getPersistedDefaultTerminalHidden("chat-2")).toBe(true);
	});

	it("ignores invalid stored values", () => {
		localStorage.setItem(
			`${rightPanelTabStorageKeyPrefix}chat-1`,
			JSON.stringify([{ id: "bad-tab", kind: "terminal" }]),
		);

		expect(getPersistedRightPanelTabs("chat-1")).toEqual([]);
	});

	it("ignores stored terminal tabs with malformed reconnect tokens", () => {
		localStorage.setItem(
			`${rightPanelTabStorageKeyPrefix}chat-1`,
			JSON.stringify([terminalTab({ reconnectionToken: "not-a-uuid" })]),
		);

		expect(getPersistedRightPanelTabs("chat-1")).toEqual([]);
	});
});

describe("default terminal hidden storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("round trips a hidden terminal flag", () => {
		savePersistedDefaultTerminalHidden("chat-1", true);

		expect(getPersistedDefaultTerminalHidden("chat-1")).toBe(true);
		expect(getPersistedDefaultTerminalHidden("chat-2")).toBe(false);
	});

	it("removes the stored flag when saving false", () => {
		savePersistedDefaultTerminalHidden("chat-1", true);

		savePersistedDefaultTerminalHidden("chat-1", false);

		expect(getPersistedDefaultTerminalHidden("chat-1")).toBe(false);
		expect(localStorage.length).toBe(0);
	});

	it("ignores undefined chat IDs", () => {
		savePersistedDefaultTerminalHidden(undefined, true);

		expect(getPersistedDefaultTerminalHidden(undefined)).toBe(false);
		expect(localStorage.length).toBe(0);
	});

	it("treats malformed values as visible", () => {
		savePersistedDefaultTerminalHidden("chat-1", true);
		const key = localStorage.key(0);
		if (!key) {
			throw new Error("expected default terminal hidden key to be stored");
		}
		localStorage.setItem(key, "yes");

		expect(getPersistedDefaultTerminalHidden("chat-1")).toBe(false);
	});
});
