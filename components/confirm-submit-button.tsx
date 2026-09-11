"use client";

/**
 * Almindelig submit-knap der kræver et window.confirm() før formularen
 * reelt sendes — til handlinger der er svære at fortryde (fx nulstilling
 * af en andens 2FA), ikke noget der skal kunne trykkes ved et uheld.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  className,
  formId,
}: {
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
  formId?: string;
}) {
  return (
    <button
      type="submit"
      form={formId}
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
