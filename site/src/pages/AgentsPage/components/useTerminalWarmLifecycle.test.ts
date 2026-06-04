import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	TERMINAL_IDLE_DETACH_MS,
	useTerminalWarmLifecycle,
} from "./useTerminalWarmLifecycle";

describe("useTerminalWarmLifecycle", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it("keeps a not-hot terminal mounted until the idle grace period ends", () => {
		const { result, rerender } = renderHook(
			({ isHot }) =>
				useTerminalWarmLifecycle({
					isHot,
					detachDelayMs: TERMINAL_IDLE_DETACH_MS,
				}),
			{ initialProps: { isHot: true } },
		);

		expect(result.current.shouldMountTerminal).toBe(true);

		rerender({ isHot: false });
		expect(result.current.shouldMountTerminal).toBe(true);

		act(() => {
			vi.advanceTimersByTime(TERMINAL_IDLE_DETACH_MS - 1);
		});
		expect(result.current.shouldMountTerminal).toBe(true);

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current.shouldMountTerminal).toBe(false);
	});

	it("clears the detach timer when the terminal becomes hot again", () => {
		const { result, rerender } = renderHook(
			({ isHot }) =>
				useTerminalWarmLifecycle({
					isHot,
					detachDelayMs: TERMINAL_IDLE_DETACH_MS,
				}),
			{ initialProps: { isHot: true } },
		);

		rerender({ isHot: false });
		act(() => {
			vi.advanceTimersByTime(TERMINAL_IDLE_DETACH_MS / 2);
		});
		rerender({ isHot: true });
		act(() => {
			vi.advanceTimersByTime(TERMINAL_IDLE_DETACH_MS);
		});

		expect(result.current.shouldMountTerminal).toBe(true);
	});

	it("resets connection status when the terminal detaches", () => {
		const { result, rerender } = renderHook(
			({ isHot }) =>
				useTerminalWarmLifecycle({
					isHot,
					detachDelayMs: TERMINAL_IDLE_DETACH_MS,
				}),
			{ initialProps: { isHot: true } },
		);

		act(() => {
			result.current.setConnectionStatus("connected");
		});
		expect(result.current.connectionStatus).toBe("connected");

		rerender({ isHot: false });
		act(() => {
			vi.advanceTimersByTime(TERMINAL_IDLE_DETACH_MS);
		});

		expect(result.current.shouldMountTerminal).toBe(false);
		expect(result.current.connectionStatus).toBe("initializing");
	});
});
