/**
 * ProGateDialog — stub for open-source builds.
 *
 * When the private payment submodule is present, this file is replaced
 * by a symlink to the real implementation via `make setup-payment`.
 */

interface ProGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expired?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProGateDialog(_props: ProGateDialogProps) {
  return null;
}
