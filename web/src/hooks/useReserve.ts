import { useMemo, useState } from "react";
import { applyIncome, applyPayment, type Reserve } from "../domain/models";
import { readStored, writeStored } from "../services/storage";
import { useCabinet } from "../state/CabinetContext";

export function useReserve() {
  const { user, demo } = useCabinet();
  const key = `alfa-buziness:reserve-simulation:${demo ? "demo" : "server"}:${user?.id}`;
  const [revision, setRevision] = useState(0);
  const reserve = useMemo(
    () =>
      readStored<Reserve>(key, {
        active: false,
        limit: 500000,
        ownFunds: 80000,
        debt: 0,
        events: [],
      }),
    [key, revision],
  );
  function commit(next: Reserve) {
    writeStored(key, next);
    setRevision((v) => v + 1);
  }
  return {
    reserve,
    activate: () => commit({ ...reserve, active: true }),
    pay: (amount: number, description: string) =>
      commit(applyPayment(readStored(key, reserve), amount, description)),
    receive: (amount: number) =>
      commit(applyIncome(readStored(key, reserve), amount)),
  };
}
