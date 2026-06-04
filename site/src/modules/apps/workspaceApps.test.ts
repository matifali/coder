import {
	MockWorkspace,
	MockWorkspaceAgent,
	MockWorkspaceApp,
} from "#/testHelpers/entities";
import { getAllAppsWithAgent, isWorkspaceAppEmbeddable } from "./workspaceApps";

describe("getAllAppsWithAgent", () => {
	it("flattens workspace apps with their owning agent", () => {
		const apps = getAllAppsWithAgent(MockWorkspace);

		expect(apps).toContainEqual({
			...MockWorkspaceApp,
			agent: MockWorkspaceAgent,
		});
	});
});

describe("isWorkspaceAppEmbeddable", () => {
	const baseApp = {
		...MockWorkspaceApp,
		open_in: "tab" as const,
	};

	it.each([
		[
			"subdomain apps",
			{ ...baseApp, subdomain: true, subdomain_name: "preview" },
		],
		[
			"subdomain apps without configured wildcard access",
			{ ...baseApp, subdomain: true, subdomain_name: "" },
		],
		[
			"path-based apps",
			{ ...baseApp, subdomain: false, subdomain_name: undefined },
		],
	])("embeds %s", (_name, app) => {
		expect(isWorkspaceAppEmbeddable(app)).toBe(true);
	});

	it.each([
		["command apps", { ...baseApp, command: "npm start" }],
		[
			"external apps",
			{ ...baseApp, external: true, url: "https://example.com" },
		],
		["hidden apps", { ...baseApp, hidden: true }],
	])("rejects %s", (_name, app) => {
		expect(isWorkspaceAppEmbeddable(app)).toBe(false);
	});
});
