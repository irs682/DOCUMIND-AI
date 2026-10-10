import React from 'react';

const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      className = '',
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {LeftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <LeftIcon size={18} />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 ${
              LeftIcon ? 'pl-10' : ''
            } ${RightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
            } ${className}`}
            {...props}
          />
          {RightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <RightIcon size={18} />
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
