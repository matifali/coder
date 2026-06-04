import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	ChevronDownIcon,
	LayoutGridIcon,
	NetworkIcon,
	PlusIcon,
	SquareTerminalIcon,
} from "lucide-react";
import { useState } from "react";
import { fn } from "storybook/test";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/DropdownMenu/DropdownMenu";
import type { SidebarTab } from "./SidebarTabView";
import { SidebarTabView } from "./SidebarTabView";

const makePanelContent = (label: string) => (
	<div className="flex h-full items-center justify-center p-6 text-sm text-content-secondary">
		Content for {label}
	</div>
);

const makeBadge = (additions: number, deletions: number) => (
	<span className="inline-flex h-full items-center self-stretch overflow-hidden font-mono text-xs font-medium">
		{additions > 0 && (
			<span className="flex h-full items-center bg-surface-git-added px-1.5 text-git-added-bright">
				+{additions}
			</span>
		)}
		{deletions > 0 && (
			<span className="flex h-full items-center bg-surface-git-deleted px-1.5 text-git-deleted-bright">
				&minus;{deletions}
			</span>
		)}
	</span>
);

const gitTab: SidebarTab = {
	id: "git",
	label: "Git",
	badge: makeBadge(42, 7),
	content: makePanelContent("Git"),
};

const meta: Meta<typeof SidebarTabView> = {
	title: "pages/AgentsPage/SidebarTabView",
	component: SidebarTabView,
	args: {
		tabs: [gitTab],
		effectiveTabId: "git",
		onActiveTabChange: fn(),
		isExpanded: false,
		onToggleExpanded: fn(),
	},
	decorators: [
		(Story) => (
			<div style={{ height: 500, width: 480 }}>
				<Story />
			</div>
		),
	],
};
export default meta;
type Story = StoryObj<typeof SidebarTabView>;

export const GitWithBadge: Story = {};

export const GitNoBadge: Story = {
	args: {
		tabs: [{ ...gitTab, badge: undefined }],
	},
};

export const MultipleTabs: Story = {
	args: {
		tabs: [
			gitTab,
			{ id: "preview", label: "Preview", content: makePanelContent("Preview") },
		],
	},
};

export const EmptyState: Story = {
	args: {
		tabs: [],
	},
};

export const DesktopHidden: Story = {
	args: {
		tabs: [],
		desktopChatId: undefined,
	},
};

export const ExpandedWithTitle: Story = {
	args: {
		tabs: [gitTab],
		isExpanded: true,
		chatTitle: "Fix authentication bug",
	},
	decorators: [
		(Story) => (
			<div style={{ height: 500, width: 900 }}>
				<Story />
			</div>
		),
	],
};

export const NarrowPanel: Story = {
	args: {
		tabs: [gitTab],
	},
	decorators: [
		(Story) => (
			<div style={{ height: 500, width: 360 }}>
				<Story />
			</div>
		),
	],
};

export const CloseableTabs: Story = {
	render: function CloseableTabs() {
		const [activeTabId, setActiveTabId] = useState("git");
		const [tabs, setTabs] = useState<SidebarTab[]>([
			gitTab,
			{
				id: "terminal",
				label: "Terminal",
				content: makePanelContent("Terminal"),
			},
			{ id: "debug", label: "Debug", content: makePanelContent("Debug") },
			...Array.from({ length: 8 }, (_, index) => ({
				id: `terminal-${index + 2}`,
				label: `Terminal ${index + 2}`,
				content: makePanelContent(`Terminal ${index + 2}`),
				closeable: true,
			})),
		]);

		return (
			<SidebarTabView
				tabs={tabs.map((tab) => ({
					...tab,
					onClose: tab.closeable
						? () => {
								setTabs((currentTabs) =>
									currentTabs.filter((currentTab) => currentTab.id !== tab.id),
								);
								if (activeTabId === tab.id) {
									setActiveTabId("git");
								}
							}
						: undefined,
				}))}
				effectiveTabId={activeTabId}
				onActiveTabChange={setActiveTabId}
				isExpanded={false}
				onToggleExpanded={() => {}}
				addTabControl={<MockAddTabControl />}
			/>
		);
	},
};

function MockAddTabControl() {
	return (
		<div className="flex h-6 shrink-0 items-center overflow-hidden rounded-md border border-solid border-border-default bg-surface-primary text-content-secondary">
			<button
				type="button"
				aria-label="New terminal tab"
				title="New terminal tab"
				className="flex h-full cursor-pointer items-center justify-center border-0 border-r border-solid border-border-default bg-transparent px-1.5 hover:bg-surface-secondary hover:text-content-primary"
			>
				<PlusIcon className="size-3.5" />
			</button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Add panel"
						className="flex h-full cursor-pointer items-center justify-center border-0 bg-transparent px-1 hover:bg-surface-secondary hover:text-content-primary"
					>
						<ChevronDownIcon className="size-3" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					side="bottom"
					className="w-52 p-1 [&_[role=menuitem]]:py-1 [&_[role=menuitem]]:text-xs [&_svg]:!size-3.5"
				>
					<DropdownMenuItem>
						<SquareTerminalIcon />
						New Terminal
					</DropdownMenuItem>
					<DropdownMenuSeparator className="my-1" />
					<DropdownMenuItem>
						<LayoutGridIcon />
						Preview app
					</DropdownMenuItem>
					<DropdownMenuSeparator className="my-1" />
					<DropdownMenuItem>
						<NetworkIcon />
						Ports (1)
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
