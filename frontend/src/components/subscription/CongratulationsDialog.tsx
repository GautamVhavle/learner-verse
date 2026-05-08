/**
 * CongratulationsDialog — stub for open-source builds.
 *
 * When the private payment submodule is present, this file is replaced
 * by a symlink to the real implementation via `make setup-payment`.
 */

interface CongratulationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CongratulationsDialog(_props: CongratulationsDialogProps) {
  return null;
}
