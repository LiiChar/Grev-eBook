import { JSX, splitProps } from 'solid-js';

export type GlassPanelProps = {
  variant?: 'default' | 'strong' | 'subtle';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: JSX.Element;
} & JSX.HTMLAttributes<HTMLDivElement>;

const roundedMap = {
  sm: 'rounded-sm',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

const paddingMap = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

const variantMap = {
  default: 'glass',
  strong: 'glass-strong',
  subtle: 'glass-subtle',
};

export function GlassPanel(props: GlassPanelProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'rounded',
    'padding',
    'children',
    'class',
  ]);

  const classes = () => {
    const variant = variantMap[local.variant ?? 'default'];
    const rounded = roundedMap[local.rounded ?? 'lg'];
    const padding = paddingMap[local.padding ?? 'md'];
    return `${variant} ${rounded} ${padding} ${local.class ?? ''}`.trim();
  };

  return (
    <div {...rest} class={classes()}>
      {local.children}
    </div>
  );
}

