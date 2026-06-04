import { PlusIcon } from "lucide-react";
import type { FC } from "react";
import { Button } from "#/components/Button/Button";

export const RightPanelAddTabControl: FC<{
	disabled?: boolean;
	onNewTerminal: () => void;
}> = ({ disabled, onNewTerminal }) => {
	return (
		<Button
			variant="outline"
			size="icon"
			onClick={onNewTerminal}
			disabled={disabled}
			aria-label="New terminal tab"
			title="New terminal tab"
			className="size-6 bg-surface-primary p-0 text-content-secondary hover:text-content-primary"
		>
			<PlusIcon className="size-3.5" />
		</Button>
	);
};
