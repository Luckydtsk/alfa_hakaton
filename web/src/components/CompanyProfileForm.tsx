import { useState, type FormEvent } from "react";
import type { CompanyProfile } from "../domain/models";
import { useCabinet } from "../state/CabinetContext";
import { useOperation } from "../hooks/useOperation";
import { Button, ErrorMessage, Field, Input, Muted, Select, Stack } from "./ui";

export function CompanyProfileForm({ onSaved }: { onSaved: () => void }) {
  const { profile, saveProfile, meta, user, demo } = useCabinet();
  const [value, setValue] = useState<CompanyProfile>(profile);
  const operation = useOperation();
  function submit(event: FormEvent) {
    event.preventDefault();
    void operation.run(async () => {
      saveProfile(value);
      onSaved();
    });
  }
  return (
    <form onSubmit={submit}>
      <Stack>
        <Muted>
          {user?.company?.name} · ИНН {user?.company?.inn}
        </Muted>
        <Field label="Форма бизнеса">
          <Select
            value={value.businessType}
            onChange={(e) =>
              setValue({ ...value, businessType: e.target.value })
            }
          >
            <option>ООО</option>
            <option>ИП</option>
          </Select>
        </Field>
        <Field label="Возраст бизнеса">
          <Select
            required
            value={value.businessAge}
            onChange={(e) =>
              setValue({ ...value, businessAge: e.target.value })
            }
          >
            <option value="">Выберите возраст</option>
            {meta?.ages.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Отрасль">
          <Select
            required
            value={value.industryCode}
            onChange={(e) =>
              setValue({ ...value, industryCode: e.target.value })
            }
          >
            <option value="">Выберите отрасль</option>
            {meta?.industries.map((i) => (
              <option key={i.code} value={i.code}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Число сотрудников">
          <Input
            type="number"
            required
            min={0}
            max={100000}
            step={1}
            value={value.jobsSupported ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                jobsSupported:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </Field>
        <Muted>
          {demo
            ? "Демонстрационные сведения сохраняются в этом браузере."
            : "Сведения сохраняются в этом браузере для вашего аккаунта и используются при отправке заявки. На другом устройстве может потребоваться заполнить их заново."}
        </Muted>
        <ErrorMessage message={operation.error} />
        <Button type="submit" disabled={!meta || operation.busy}>
          Сохранить сведения
        </Button>
      </Stack>
    </form>
  );
}
