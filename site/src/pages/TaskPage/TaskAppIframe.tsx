import type { FC } from "react";
import type { Workspace } from "#/api/typesGenerated";
import {
	WorkspaceAppFrame,
	WorkspaceIframe,
} from "#/modules/apps/WorkspaceAppFrame";
import type { WorkspaceAppWithAgent } from "#/modules/apps/workspaceApps";

type TaskAppIFrameProps = {
	workspace: Workspace;
	app: WorkspaceAppWithAgent;
	active: boolean;
};

export const TaskAppIFrame: FC<TaskAppIFrameProps> = ({
	workspace,
	app,
	active,
}) => {
	return <WorkspaceAppFrame workspace={workspace} app={app} active={active} />;
};

export const TaskIframe = WorkspaceIframe;
