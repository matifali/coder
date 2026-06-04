import type {
	Workspace,
	WorkspaceAgent,
	WorkspaceApp,
} from "#/api/typesGenerated";
import { isExternalApp } from "./apps";

export type WorkspaceAppWithAgent = WorkspaceApp & {
	agent: WorkspaceAgent;
};

export function getWorkspaceAgents(workspace: Workspace): WorkspaceAgent[] {
	return workspace.latest_build.resources.flatMap((resource) => [
		...(resource.agents ?? []),
	]);
}

export function getAllAppsWithAgent(
	workspace: Workspace,
): WorkspaceAppWithAgent[] {
	return getWorkspaceAgents(workspace).flatMap((agent) =>
		agent.apps.map((app) => ({
			...app,
			agent,
		})),
	);
}

export function findWorkspaceAgent(
	workspace: Workspace,
	agentId: string,
): WorkspaceAgent | undefined {
	return getWorkspaceAgents(workspace).find((agent) => agent.id === agentId);
}

export function findWorkspaceAppWithAgent(
	workspace: Workspace,
	agentId: string,
	appId: string,
): WorkspaceAppWithAgent | undefined {
	const agent = findWorkspaceAgent(workspace, agentId);
	const app = agent?.apps.find((app) => app.id === appId);
	if (!agent || !app) {
		return undefined;
	}
	return { ...app, agent };
}

/**
 * Whether a workspace app can be embedded in an in-dashboard iframe tab.
 *
 * Mirrors the Coder Tasks behaviour, which embeds every app that is not an
 * external (open-locally) app. Both path-based and subdomain apps render in an
 * iframe via `WorkspaceAppFrame`; a subdomain app without a configured wildcard
 * access URL shows a warning inside the frame rather than being hidden. Command
 * apps are excluded because they open as a renamed terminal tab running the
 * command instead of an iframe.
 */
export function isWorkspaceAppEmbeddable(app: WorkspaceApp): boolean {
	return !app.hidden && !isExternalApp(app) && !app.command;
}
