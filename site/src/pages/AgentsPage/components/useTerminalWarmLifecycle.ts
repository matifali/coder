import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useEffectEvent,
	useState,
} from "react";
import type { ConnectionStatus } from "#/modules/terminal/types";

/** Keeps a recently hidden terminal attached long enough for quick tab toggles. */
export const TERMINAL_IDLE_DETACH_MS = 30_000;

type TerminalWarmLifecycleParams = {
	isHot?: boolean;
	detachDelayMs?: number;
};

type TerminalWarmLifecycle = {
	shouldMountTerminal: boolean;
	connectionStatus: ConnectionStatus;
	setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>;
};

export const useTerminalWarmLifecycle = ({
	isHot,
	detachDelayMs = TERMINAL_IDLE_DETACH_MS,
}: TerminalWarmLifecycleParams): TerminalWarmLifecycle => {
	const [isWarm, setIsWarm] = useState(Boolean(isHot));
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>("initializing");
	const detachTerminal = useEffectEvent(() => {
		setIsWarm(false);
		setConnectionStatus("initializing");
	});

	useEffect(() => {
		if (isHot) {
			setIsWarm(true);
			return;
		}
		if (!isWarm) {
			return;
		}

		const timer = setTimeout(detachTerminal, detachDelayMs);
		return () => clearTimeout(timer);
	}, [detachDelayMs, isHot, isWarm]);

	return {
		shouldMountTerminal: Boolean(isHot) || isWarm,
		connectionStatus,
		setConnectionStatus,
	};
};
