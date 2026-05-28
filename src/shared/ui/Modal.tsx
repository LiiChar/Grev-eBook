import { Component, createEffect, onCleanup, Show } from 'solid-js';
import { Icon } from './Icon';
import { X } from 'lucide-solid';
import Button from './Button';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: any;
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
	position?: 'top' | 'middle' | 'bottom';
	closeOnBackdrop?: boolean;
}

const Modal: Component<ModalProps> = props => {
	let dialogRef!: HTMLDialogElement;

	createEffect(() => {
		if (!dialogRef) return;
		if (props.isOpen) {
			if (!dialogRef.open) dialogRef.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			if (dialogRef.open) dialogRef.close();
			document.body.style.overflow = '';
		}
	});

	onCleanup(() => {
		document.body.style.overflow = '';
	});

	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'w-[80%] h-full',
		xl: 'max-w-xl',
		full: 'w-screen h-screen m-0 rounded-none',
	};

	return (
		<Show when={props.isOpen}>
			<dialog
				ref={dialogRef}
				class='fixed inset-0 z-[999] glass w-full h-full flex items-center justify-center p-4 open:animate-fade-in'
				onClose={props.onClose}
				onCancel={props.onClose}
				onClick={e => {
					if (props.closeOnBackdrop !== false && e.target === dialogRef) {
						props.onClose();
					}
				}}
			>
				<div
					class={`bg-background rounded-xl shadow-xl overflow-hidden w-full ${sizeClasses[props.size ?? 'md']}`}
				>
					{props.title && (
						<div class='px-5 py-4 border-b font-semibold text-lg'>{props.title}</div>
					)}
					{props.children}
					<Button
						variant='outline'
						class='absolute w-9.5 h-9.5 min-w-9.5 min-h-9.5 max-w-9.5 max-h-9.5 top-1 right-1 -translate-x-5 rounded-lg translate-y-5 p-2 text-2xl cursor-pointer'
						onClick={props.onClose}
					>
						<X />
					</Button>
				</div>
			</dialog>
		</Show>
	);
};

export default Modal;
