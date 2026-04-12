import { Component, JSX } from 'solid-js';

type ProgressColor =
	| 'neutral'
	| 'primary'
	| 'secondary'
	| 'accent'
	| 'info'
	| 'success'
	| 'warning'
	| 'error';

interface ProgressProps
	extends JSX.ProgressHTMLAttributes<HTMLProgressElement> {
	color?: ProgressColor;
	value?: number;
	max?: number;
	class?: string;
}

const Progress: Component<ProgressProps> = props => {
	const { color, value, max = 100, class: className, ...rest } = props;

	const colorClass = color ? `progress-${color}` : '';
	const baseClass = 'progress';

	return (
		<progress
			{...rest}
			class={[baseClass, colorClass, className].filter(Boolean).join(' ')}
			value={value}
			max={max}
		/>
	);
};

export default Progress;
