// src/components/Button.tsx
import { Component, JSX } from 'solid-js';

type ButtonColor =
	| 'neutral'
	| 'primary'
	| 'secondary'
	| 'accent'
	| 'info'
	| 'success'
	| 'warning'
	| 'error';

type ButtonStyle = 'outline' | 'dash' | 'soft' | 'ghost' | 'link';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	color?: ButtonColor;
	style?: ButtonStyle;
	size?: ButtonSize;
	active?: boolean;
	disabled?: boolean;
	wide?: boolean;
	block?: boolean;
	square?: boolean;
	circle?: boolean;
	loading?: boolean;
	children: JSX.Element;
}

const Button: Component<ButtonProps> = props => {
	const {
		color,
		style,
		size,
		active,
		disabled,
		wide,
		block,
		square,
		circle,
		loading,
		children,
		class: className,
		...rest
	} = props;

	// Формируем классы
	const classes = () => {
		const base = 'btn';
		const colorClass = color ? `btn-${color}` : '';
		const styleClass = style ? `btn-${style}` : '';
		const sizeClass = size ? `btn-${size}` : '';
		const stateClasses = [
			active && 'btn-active',
			disabled && 'btn-disabled',
			wide && 'btn-wide',
			block && 'btn-block',
			square && 'btn-square',
			circle && 'btn-circle',
		]
			.filter(Boolean)
			.join(' ');

		return [base, colorClass, styleClass, sizeClass, stateClasses, className]
			.filter(Boolean)
			.join(' ');
	};

	return (
		<button {...rest} class={classes()} disabled={disabled || loading}>
			{loading && (
				<span class='loading loading-spinner' aria-hidden='true'></span>
			)}
			{!loading && children}
		</button>
	);
};

export default Button;
