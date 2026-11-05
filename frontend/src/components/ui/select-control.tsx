import type { ComponentPropsWithRef } from 'react';
import { Icon } from './icon';

export function SelectControl({
  className = '',
  containerClassName = '',
  ...props
}: ComponentPropsWithRef<'select'> & { containerClassName?: string }) {
  return (
    <span
      dir={props.dir}
      className={`relative block min-w-0 ${containerClassName}`}
    >
      <select
        {...props}
        className={`peer block w-full min-w-0 appearance-none text-ellipsis ps-4 pe-12 disabled:opacity-70 forced-colors:appearance-auto forced-colors:pe-4 ${className}`}
      />
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted peer-disabled:opacity-70 forced-colors:invisible"
      />
    </span>
  );
}
