import { ApplicationList } from "../components/ApplicationList";
import { Muted, PageHeading, SectionHeading } from "../components/ui";
import { useCabinet } from "../state/CabinetContext";

export function BankPage() {
  const { applications, loading } = useCabinet();
  const queue = applications.filter((a) => a.status === "manual_review"),
    rest = applications.filter((a) => a.status !== "manual_review");
  return (
    <>
      <PageHeading
        title="Заявки на рассмотрении"
        description="Рабочее место сотрудника банка."
      />
      {loading ? (
        <Muted>Загружаем очередь…</Muted>
      ) : (
        <>
          <SectionHeading>Ожидают решения · {queue.length}</SectionHeading>
          <ApplicationList items={queue} bank />
          <section style={{ marginTop: 36 }}>
            <SectionHeading>Остальные заявки</SectionHeading>
            <ApplicationList items={rest} bank />
          </section>
        </>
      )}
    </>
  );
}
