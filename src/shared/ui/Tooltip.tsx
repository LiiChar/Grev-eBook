import TooltipCorvu from '@corvu/tooltip'; // 'corvu/tooltip'
// or
// import { Root, Trigger, ... } from '@corvu/tooltip'

type TooltipProps = {
	children: any;
  text: string
};

export const Tooltip = ({children, text}: TooltipProps) => {
  return (
		<TooltipCorvu
			placement='top'
			openDelay={200}
			floatingOptions={{
				offset: 5,
				flip: true,
				shift: true,
			}}
		>
			<TooltipCorvu.Trigger class=''>
				{children}
			</TooltipCorvu.Trigger>
			<TooltipCorvu.Portal>
				<TooltipCorvu.Content class='rounded-lg bg-corvu-100 px-3 py-2 font-medium data-open:animate-in data-open:fade-in-50% data-open:slide-in-from-bottom-1 data-closed:animate-out data-closed:fade-out-50% data-closed:slide-out-to-bottom-1'>
					{text}
					{/* <TooltipCorvu.Arrow /> */}
				</TooltipCorvu.Content>
			</TooltipCorvu.Portal>
		</TooltipCorvu>
	);
};