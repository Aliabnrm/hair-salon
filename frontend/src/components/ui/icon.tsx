import type { CSSProperties } from 'react';

export type IconName =
  | 'search'
  | 'pin'
  | 'chevron-down'
  | 'back'
  | 'forward'
  | 'clock'
  | 'calendar'
  | 'user'
  | 'check'
  | 'info'
  | 'alert'
  | 'wifi-off'
  | 'refresh'
  | 'ticket'
  | 'shield'
  | 'close'
  | 'scissors'
  | 'sparkle';

// Masks use the exact SVGs exported from the confirmed Make source.
export function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const style: CSSProperties & { '--icon-url': string } = {
    width: size,
    height: size,
    '--icon-url': `url('/assets/icons/${name}.svg')`,
  };
  return (
    <span aria-hidden="true" className={`icon ${className}`} style={style} />
  );
}
