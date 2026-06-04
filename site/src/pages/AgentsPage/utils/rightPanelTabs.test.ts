import { MockWorkspace, MockWorkspaceAgent } from "#/testHelpers/entities";
import {
	getPersistedRightPanelTabs,
	rightPanelTabStorageKeyPrefix,
	savePersistedRightPanelTabs,
} from "./rightPanelTabStorage";
import {
	createTerminalReconnectionToken,
	getNextTerminalTabLabel,
	type UserRightPanelTab,
	validateUserRightPanelTabs,
} from "./rightPanelTabs";

describe("right-panel tab validation", () => {
	const tabs: UserRightPanelTab[] = [
		{
			id: "terminal-2",
			kind: "terminal",
			label: "Terminal 2",
			reconnectionToken: "11111111-1111-4111-8111-111111111111",
		},
	];

	it("keeps terminal tabs while the workspace agent exists", () => {
		expect(
			validateUserRightPanelTabs(tabs, {
				workspace: MockWorkspace,
				workspaceAgent: MockWorkspaceAgent,
			}),
		).toEqual(tabs);
	});

	it("drops terminal tabs when there is no workspace agent", () => {
		const validated = validateUserRightPanelTabs(tabs, {
			workspace: MockWorkspace,
			workspaceAgent: undefined,
		});

		expect(validated.some((tab) => tab.kind === "terminal")).toBe(false);
	});
});

describe("terminal tab helpers", () => {
	it("uses the first missing terminal number", () => {
		expect(
			getNextTerminalTabLabel([
				{
					id: "terminal-2",
					kind: "terminal",
					label: "Terminal 2",
					reconnectionToken: "11111111-1111-4111-8111-111111111111",
				},
				{
					id: "terminal-4",
					kind: "terminal",
					label: "Terminal 4",
					reconnectionToken: "22222222-2222-4222-8222-222222222222",
				},
			]),
		).toBe("Terminal 3");
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
		const tabs: UserRightPanelTab[] = [
			{
				id: "terminal-2",
				kind: "terminal",
				label: "Terminal 2",
				reconnectionToken: "11111111-1111-4111-8111-111111111111",
			},
		];

		savePersistedRightPanelTabs("chat-1", tabs);

		expect(getPersistedRightPanelTabs("chat-1")).toEqual(tabs);
		expect(getPersistedRightPanelTabs("chat-2")).toEqual([]);
	});

	it("persists command-app terminal tabs", () => {
		const tabs: UserRightPanelTab[] = [
			{
				id: "terminal-claude",
				kind: "terminal",
				label: "Claude Code",
				reconnectionToken: "11111111-1111-4111-8111-111111111111",
				initialCommand: "claude",
				sourceAppId: "claude-app",
			},
		];

		savePersistedRightPanelTabs("chat-1", tabs);

		expect(getPersistedRightPanelTabs("chat-1")).toEqual(tabs);
	});

	it("ignores invalid stored values", () => {
		localStorage.setItem(
			`${rightPanelTabStorageKeyPrefix}chat-1`,
			JSON.stringify([{ id: "bad-tab", kind: "terminal" }]),
		);

		expect(getPersistedRightPanelTabs("chat-1")).toEqual([]);
	});
});
