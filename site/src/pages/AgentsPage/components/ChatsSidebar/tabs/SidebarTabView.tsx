import {
	ArrowLeftIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	MaximizeIcon,
	MinimizeIcon,
	PanelLeftIcon,
	XIcon,
} from "lucide-react";
import {
	type FC,
	type ReactNode,
	useEffect,
	useEffectEvent,
	useId,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/Button/Button";
import { cn } from "#/utils/cn";
import { DesktopPanel } from "../../RightPanel/DesktopPanel";

/** A single tab definition for the sidebar panel. */
export interface SidebarTab {
	id: string;
	/** Label shown in the tab button. */
	label: string;
	/** Optional icon shown before the label. */
	icon?: ReactNode;
	/** Optional badge shown after the label. */
	badge?: ReactNode;
	/** The content to render when this tab is active. */
	content: ReactNode;
	/** Providing this callback makes the tab closeable. */
	onClose?: () => void;
}

interface SidebarTabViewProps {
	/** The tabs to display. */
	tabs: SidebarTab[];
	/** Whether the panel is in expanded/fullscreen mode. */
	isExpanded: boolean;
	/** Callback to toggle expanded state. */
	onToggleExpanded: () => void;
	/** Whether the left sidebar is collapsed. */
	isSidebarCollapsed?: boolean;
	/** Callback to toggle left sidebar. */
	onToggleSidebarCollapsed?: () => void;
	/** Shown in center when expanded. */
	chatTitle?: string;
	/** Callback to close the panel (used on mobile). */
	onClose?: () => void;
	/** Desktop chat ID. Omitted if desktop is not available. */
	desktopChatId?: string;
	/**
	 * The resolved tab ID to render as active (computed by the parent
	 * with `getEffectiveTabId`). Keeping a single source of truth in the
	 * parent prevents this component's highlight from drifting from
	 * parent-side gating like `TerminalPanel.isVisible` or
	 * `DebugPanel.isVisible`.
	 */
	effectiveTabId: string | null;
	/** Called when the user switches tabs. */
	onActiveTabChange: (tabId: string) => void;
	/** Optional control rendered at the end of the tab strip. */
	addTabControl?: ReactNode;
}

/** How far each chevron click scrolls the tab strip. */
const TAB_SCROLL_AMOUNT = 120;

function useTabScroll() {
	const ref = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const updateScrollState = useEffectEvent(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		setCanScrollLeft(element.scrollLeft > 0);
		setCanScrollRight(
			element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
		);
	});

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		updateScrollState();
		element.addEventListener("scroll", updateScrollState, { passive: true });

		const resizeObserver = new ResizeObserver(updateScrollState);
		resizeObserver.observe(element);

		return () => {
			element.removeEventListener("scroll", updateScrollState);
			resizeObserver.disconnect();
		};
	}, []);

	useEffect(() => {
		updateScrollState();
	});

	const scrollLeft = () => {
		ref.current?.scrollBy({
			left: -TAB_SCROLL_AMOUNT,
			behavior: "smooth",
		});
	};

	const scrollRight = () => {
		ref.current?.scrollBy({
			left: TAB_SCROLL_AMOUNT,
			behavior: "smooth",
		});
	};

	return { ref, canScrollLeft, canScrollRight, scrollLeft, scrollRight };
}

export const SidebarTabView: FC<SidebarTabViewProps> = ({
	tabs,
	isExpanded,
	onToggleExpanded,
	isSidebarCollapsed,
	onToggleSidebarCollapsed,
	chatTitle,
	onClose,
	desktopChatId,
	effectiveTabId,
	onActiveTabChange,
	addTabControl,
}) => {
	const tabIdPrefix = useId();
	const {
		ref: tabScrollRef,
		canScrollLeft,
		canScrollRight,
		scrollLeft: scrollTabsLeft,
		scrollRight: scrollTabsRight,
	} = useTabScroll();

	const allPanels: { id: string; content: ReactNode }[] = tabs.map((t) => ({
		id: t.id,
		content: t.content,
	}));
	if (desktopChatId) {
		allPanels.push({
			id: "desktop",
			content: (
				<DesktopPanel
					chatId={desktopChatId}
					isVisible={effectiveTabId === "desktop"}
				/>
			),
		});
	}

	if (tabs.length === 0 && !desktopChatId) {
		return (
			<div className="flex h-full min-w-0 flex-col overflow-hidden bg-surface-primary">
				<div
					role="tablist"
					className="flex shrink-0 items-center gap-2 border-0 border-b border-solid border-border-default px-4 py-1.5 lg:px-3 lg:py-1"
				>
					{onClose && (
						<Button
							variant="subtle"
							size="icon"
							onClick={onClose}
							aria-label="Close panel"
							className="size-7 shrink-0 lg:hidden"
						>
							<ArrowLeftIcon />
						</Button>
					)}
					<div className="min-w-0 shrink-0 text-center">
						{isExpanded && chatTitle && (
							<span className="truncate text-sm text-content-primary">
								{chatTitle}
							</span>
						)}
					</div>
					{addTabControl}
					<Button
						variant="subtle"
						size="icon"
						onClick={onToggleExpanded}
						aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
						className="hidden size-7 shrink-0 text-content-secondary hover:text-content-primary lg:inline-flex"
					>
						{isExpanded ? <MinimizeIcon /> : <MaximizeIcon />}
					</Button>
				</div>
				<div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-content-secondary">
					No panels available.
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full min-w-0 flex-col overflow-hidden bg-surface-primary">
			<div
				role="tablist"
				className="relative flex shrink-0 items-center gap-2 border-0 border-b border-solid border-border-default px-4 py-1.5 lg:px-3 lg:py-1"
			>
				{onClose && (
					<Button
						variant="subtle"
						size="icon"
						onClick={onClose}
						aria-label="Close panel"
						className="size-7 shrink-0 lg:hidden"
					>
						<ArrowLeftIcon />
					</Button>
				)}
				{isExpanded && isSidebarCollapsed && onToggleSidebarCollapsed && (
					<Button
						variant="subtle"
						size="icon"
						onClick={onToggleSidebarCollapsed}
						aria-label="Expand sidebar"
						className="mr-1 size-7 shrink-0"
					>
						<PanelLeftIcon />
					</Button>
				)}
				<div className="relative min-w-0 flex-1">
					{canScrollLeft && (
						<button
							type="button"
							onClick={scrollTabsLeft}
							aria-label="Scroll tabs left"
							className="absolute inset-y-0 left-0 z-10 flex w-8 cursor-pointer items-center justify-start border-none p-0 pl-1 text-content-primary [background:linear-gradient(to_right,hsl(var(--surface-primary))_50%,transparent)]"
						>
							<ChevronLeftIcon className="size-3.5" />
						</button>
					)}
					<div
						ref={tabScrollRef}
						className="flex w-full min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					>
						{tabs.map((tab) => {
							const isActive = effectiveTabId === tab.id;
							const onClose = tab.onClose;
							const isCloseable = onClose !== undefined;
							const tabButton = (
								<Button
									id={`${tabIdPrefix}-tab-${tab.id}`}
									role="tab"
									aria-selected={isActive}
									onClick={() => onActiveTabChange(tab.id)}
									variant="outline"
									size="lg"
									className={cn(
										"shrink-0 h-6 min-w-0 gap-1.5 px-2 py-0 bg-surface-primary",
										isActive &&
											"bg-surface-quaternary/25 text-content-primary hover:bg-surface-quaternary/50",
										tab.badge && "pr-0",
										isCloseable && "rounded-r-none border-r-0 pr-2.5",
									)}
								>
									{tab.icon}
									{tab.label}
									{tab.badge && (
										<span
											className={cn(
												"flex -my-px items-center self-stretch transition-opacity",
												!isActive && "opacity-50",
											)}
										>
											{tab.badge}
										</span>
									)}
								</Button>
							);

							if (!isCloseable) {
								return (
									<div key={tab.id} className="flex shrink-0 items-center">
										{tabButton}
									</div>
								);
							}

							return (
								<div key={tab.id} className="flex shrink-0 items-center">
									{tabButton}
									<button
										type="button"
										onClick={(event) => {
											event.stopPropagation();
											onClose();
										}}
										aria-label={`Close ${tab.label} tab`}
										className={cn(
											"flex h-6 w-6 cursor-pointer items-center justify-center rounded-l-none rounded-r-md border border-solid border-border-default bg-surface-primary p-0 text-content-secondary hover:bg-surface-secondary hover:text-content-primary",
											isActive &&
												"bg-surface-quaternary/25 text-content-primary hover:bg-surface-quaternary/50",
										)}
									>
										<XIcon className="size-3" />
									</button>
								</div>
							);
						})}
						{desktopChatId && (
							<Button
								id={`${tabIdPrefix}-tab-desktop`}
								role="tab"
								aria-selected={effectiveTabId === "desktop"}
								onClick={() => onActiveTabChange("desktop")}
								variant="outline"
								size="lg"
								className={cn(
									"shrink-0 h-6 min-w-0 gap-1.5 px-2 py-0 bg-surface-primary",
									effectiveTabId === "desktop" &&
										"bg-surface-quaternary/25 text-content-primary hover:bg-surface-quaternary/50",
								)}
							>
								Desktop
							</Button>
						)}
						{addTabControl}
					</div>
					{canScrollRight && (
						<button
							type="button"
							onClick={scrollTabsRight}
							aria-label="Scroll tabs right"
							className="absolute inset-y-0 right-0 z-10 flex w-8 cursor-pointer items-center justify-end border-none p-0 pr-1 text-content-primary [background:linear-gradient(to_left,hsl(var(--surface-primary))_50%,transparent)]"
						>
							<ChevronRightIcon className="size-3.5" />
						</button>
					)}
				</div>
				{isExpanded && chatTitle && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<span className="truncate px-24 text-sm text-content-primary">
							{chatTitle}
						</span>
					</div>
				)}
				<Button
					variant="subtle"
					size="icon"
					onClick={onToggleExpanded}
					aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
					className="hidden size-7 shrink-0 self-start text-content-secondary hover:text-content-primary lg:inline-flex"
				>
					{isExpanded ? <MinimizeIcon /> : <MaximizeIcon />}
				</Button>
			</div>
			<div className="relative flex min-h-0 flex-1 flex-col">
				{allPanels.map((panel) => {
					const isActive = effectiveTabId === panel.id;
					return (
						<div
							key={panel.id}
							role="tabpanel"
							aria-labelledby={`${tabIdPrefix}-tab-${panel.id}`}
							className={cn(
								"min-h-0 flex-1",
								// Inactive panels stay laid out but invisible and stacked over
								// the active panel, rather than removed with `display: none`.
								// A canvas terminal keeps its painted pixels and stays
								// correctly fit while hidden, so switching back is instant;
								// dropping it from the render tree would repaint from scratch
								// and flicker blank for a frame. This also lets a freshly
								// opened terminal connect and paint off screen before the
								// parent promotes it to the active tab.
								!isActive && "invisible absolute inset-0",
							)}
							inert={!isActive}
						>
							{panel.content}
						</div>
					);
				})}
			</div>
		</div>
	);
};
