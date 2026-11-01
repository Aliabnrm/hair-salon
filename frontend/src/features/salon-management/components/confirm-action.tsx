import { useState } from 'react';
import { Button } from '../../../components/ui/button';
export function ConfirmAction({
  label,
  disabled,
  onConfirm,
}: {
  label: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2">
      <span className="text-sm">{label} انجام شود؟</span>
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => {
          setConfirm(false);
          onConfirm();
        }}
      >
        تأیید {label}
      </Button>
      <Button
        variant="ghost"
        disabled={disabled}
        onClick={() => setConfirm(false)}
      >
        انصراف
      </Button>
    </div>
  ) : (
    <Button
      variant="ghost"
      disabled={disabled}
      onClick={() => setConfirm(true)}
    >
      {label}
    </Button>
  );
}
