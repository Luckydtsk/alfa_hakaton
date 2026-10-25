import { Button, ErrorMessage, Modal, Stack } from "./ui";
import { useOperation } from "../hooks/useOperation";
import { downloadPdf } from "../services/pdf";

export function ContractModal({
  title,
  text,
  filename,
  onClose,
}: {
  title: string;
  text: string;
  filename: string;
  onClose: () => void;
}) {
  const operation = useOperation();
  return (
    <Modal title={title} onClose={onClose}>
      <Stack>
        <p
          style={{
            whiteSpace: "pre-line",
            fontSize: 14,
            lineHeight: 1.8,
            overflowWrap: "anywhere",
          }}
        >
          {text}
        </p>
        <ErrorMessage message={operation.error} />
        <Button
          variant="secondary"
          disabled={operation.busy}
          onClick={() =>
            void operation.run(() => downloadPdf(title, text, filename))
          }
        >
          {operation.busy ? "Готовим PDF…" : "Скачать образец PDF"}
        </Button>
      </Stack>
    </Modal>
  );
}
