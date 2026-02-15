import { InputHTMLAttributes, forwardRef } from 'react';

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, className, ...props }, ref) => {
    return (
      <label
        className={`
    inline-flex items-center gap-2 cursor-pointer select-none
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `}
      >
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          onChange={(e) => !disabled && onCheckedChange(e.target.checked)}
          disabled={disabled}
          ref={ref}
          {...props}
        />
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;