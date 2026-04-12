export function ToggleSwitch(props: {
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<button
			type='button'
			onClick={() => props.onChange(!props.checked)}
			class={`
        relative min-w-11 w-11 h-6 rounded-full transition-colors duration-200
        ${props.checked ? 'bg-(--primary)' : 'bg-(--border-strong)'}
      `}
		>
			<span
				class={`
          absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-md
          transition-transform duration-200
          ${props.checked ? 'translate-x-0' : '-translate-x-full'}
        `}
			/>
		</button>
	);
}
