// src/components/Modal.tsx
import { Component, createSignal, onMount, onCleanup } from 'solid-js';

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
	let dialogRef: HTMLDialogElement | undefined;

	// Управление открытием/закрытием через JS
	onMount(() => {
		if (props.isOpen && dialogRef) {
			dialogRef.showModal();
		}
	});

	// Следим за изменением isOpen
	const handleOpenChange = () => {
		if (props.isOpen && dialogRef && !dialogRef.open) {
			dialogRef.showModal();
		} else if (!props.isOpen && dialogRef && dialogRef.open) {
			dialogRef.close();
		}
	};

	// Закрытие по Escape или клику на backdrop
	const handleClose = () => {
		props.onClose();
	};

	// Применяем scrollbar-gutter к body при открытии (для предотвращения сдвига)
	onMount(() => {
		if (props.isOpen) {
			document.body.style.scrollbarGutter = 'stable';
		}
	});

	onCleanup(() => {
		// Сбрасываем scrollbar-gutter при закрытии последнего модального окна
		// (в реальном приложении лучше использовать глобальный счётчик открытых модалок)
		document.body.style.scrollbarGutter = '';
	});

	// Классы размера
	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		full: 'w-11/12 max-w-5xl',
	};

	// Классы позиции
	const positionClass =
		props.position === 'top'
			? 'modal-top'
			: props.position === 'bottom'
			? 'modal-bottom'
			: 'modal-middle'; // default

	return (
		<dialog
			ref={dialogRef}
			class={`modal z-10 ${positionClass}`}
			onClose={handleClose}
			onClick={e => {
				// Закрытие по клику на backdrop (область вне modal-box)
				if (props.closeOnBackdrop && e.target === dialogRef) {
					props.onClose();
				}
			}}
		>
			<div class={`modal-box ${sizeClasses[props.size || 'md']}`}>
				{props.title && <h3 class='text-lg font-bold'>{props.title}</h3>}
				<div class='py-4'>{props.children}</div>
				<div class='modal-action'>
					<button class='btn' onClick={props.onClose}>
						Close
					</button>
				</div>
			</div>
			{props.closeOnBackdrop && (
				<form method='dialog' class='modal-backdrop'>
					<button onClick={props.onClose}>close</button>
				</form>
			)}
		</dialog>
	);
};

export default Modal;
