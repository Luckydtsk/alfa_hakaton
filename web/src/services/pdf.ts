import type { Application } from "../api";
import { rub } from "../api";

export function applicationContract(item: Application): string {
  return `УЧЕБНЫЙ ОБРАЗЕЦ. Не является действующим договором.\n\nДоговор финансирования № ${item.id}\nКомпания: ${item.companyName}\nИНН: ${item.inn}\nЦель: ${item.goalLabel ?? item.goal ?? "Финансирование бизнеса"}\nСумма: ${rub(item.amountRub)}. Срок: ${item.termMonths ?? "—"} месяцев.\nПродукт: ${item.productLabel ?? item.product ?? "—"}\nСтатус: ${item.status}\n\nСтавка, комиссии и окончательный график текущим API не предоставляются. Этот документ фиксирует параметры заявки и не заменяет банковский договор.\nПодписание и выдача в учебном проекте смоделированы.`;
}

export const reserveContract =
  "УЧЕБНЫЙ ОБРАЗЕЦ. Не является действующим договором.\n\nЛимит резерва: 500 000 ₽.\nПримерная ставка: 18% годовых. Комиссии в примере: 0 ₽.\nСрок возврата каждого использования: не более 30 дней.\nПри недостатке собственных средств платёж использует доступный резерв. Поступления погашают задолженность, лимит восстанавливается на сумму погашенного основного долга.\nВ демонстрации операции происходят в один день, начисленные проценты равны 0 ₽.\nВсе денежные операции смоделированы и сохраняются только в браузере.";

/** Offline PDF export: canvas renders Cyrillic without remote fonts or runtime libraries. */
export async function downloadPdf(
  title: string,
  text: string,
  filename: string,
): Promise<void> {
  const width = 1240,
    height = 1754,
    margin = 100,
    pages: Uint8Array<ArrayBuffer>[] = [];
  let canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    y = 0;
  function newPage() {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Браузер не поддерживает подготовку PDF.");
    ctx = context;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ef3124";
    ctx.font = "bold 32px Arial";
    ctx.fillText("Альфа - Бузинесс", margin, 100);
    ctx.fillStyle = "#202022";
    ctx.font = "bold 36px Arial";
    ctx.fillText(title, margin, 178);
    ctx.fillStyle = "#717176";
    ctx.font = "22px Arial";
    ctx.fillText(
      `Учебный образец · ${new Date().toLocaleDateString("ru-RU")}`,
      margin,
      221,
    );
    ctx.fillStyle = "#e6e6e9";
    ctx.fillRect(margin, 250, width - margin * 2, 2);
    y = 302;
  }
  async function finishPage() {
    ctx.fillStyle = "#717176";
    ctx.font = "20px Arial";
    ctx.fillText(
      "Все операции смоделированы. Не является действующим договором.",
      margin,
      height - 100,
    );
    ctx.fillText(String(pages.length + 1), width - margin - 20, height - 100);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.96),
    );
    if (!blob) throw new Error("Не удалось сформировать страницу PDF.");
    pages.push(new Uint8Array(await blob.arrayBuffer()));
  }
  newPage();
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      y += 20;
      continue;
    }
    ctx!.font = "25px Arial";
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      // Split long identifiers too, so arbitrary purpose text cannot run outside the page.
      for (const part of word.match(/.{1,60}/gu) ?? [""]) {
        const next = line ? `${line} ${part}` : part;
        if (ctx!.measureText(next).width > width - margin * 2 && line) {
          lines.push(line);
          line = part;
        } else line = next;
      }
    }
    if (line) lines.push(line);
    for (const content of lines) {
      if (y > height - 180) {
        await finishPage();
        newPage();
      }
      ctx!.fillStyle = "#202022";
      ctx!.font = "25px Arial";
      ctx!.fillText(content, margin, y);
      y += 40;
    }
    y += 12;
  }
  await finishPage();
  const encoder = new TextEncoder(),
    chunks: Uint8Array<ArrayBuffer>[] = [],
    offsets = [0];
  let size = 0;
  function append(value: string | Uint8Array<ArrayBuffer>) {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    chunks.push(bytes);
    size += bytes.length;
  }
  function object(number: number, content: string) {
    offsets[number] = size;
    append(`${number} 0 obj\n${content}\nendobj\n`);
  }
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`,
  );
  pages.forEach((image, i) => {
    const number = 3 + i * 3;
    object(
      number,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Image ${number + 1} 0 R >> >> /Contents ${number + 2} 0 R >>`,
    );
    offsets[number + 1] = size;
    append(
      `${number + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
    );
    append(image);
    append("\nendstream\nendobj\n");
    const content = "q\n595.28 0 0 841.89 0 0 cm\n/Image Do\nQ\n";
    object(
      number + 2,
      `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`,
    );
  });
  const xref = size,
    count = 3 + pages.length * 3;
  append(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++)
    append(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  append(
    `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
  );
  const url = URL.createObjectURL(
    new Blob(chunks, { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
