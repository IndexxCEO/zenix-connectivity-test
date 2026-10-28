"use strict";
const button = document.getElementById("check");
const summary = document.getElementById("summary");
document.getElementById("js-status").textContent = "JavaScript: выполняется — успешно.";
document.getElementById("js-status").className = "ok";
const checks = [
  { id: "small", path: "assets/small.png", size: 3172, width: 32, height: 32 },
  { id: "large", path: "assets/large.png", size: 590321, width: 512, height: 384 },
  { id: "fetch", path: "assets/probe.txt", text: "ZENIX connectivity test OK\n" }
];
async function checkResource(check) {
  const status = document.getElementById(`${check.id}-status`);
  const img = document.getElementById(`${check.id}-image`);
  status.className = "";
  status.textContent = "Проверка…";
  if (img) { img.hidden = true; img.removeAttribute("src"); }
  const controller = new AbortController();
  let timedOut = false;
  let objectURL;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
  try {
    const response = await fetch(check.path, { cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    if (check.text !== undefined) {
      if (new TextDecoder("utf-8", { fatal: true }).decode(data) !== check.text) throw new Error("Содержимое ответа не совпадает с тестовым файлом");
    } else {
      if (data.byteLength !== check.size) throw new Error(`Неполный или изменённый файл: ${data.byteLength} байт вместо ${check.size}`);
      objectURL = URL.createObjectURL(new Blob([data], { type: "image/png" }));
      await new Promise((resolve, reject) => {
        const fail = () => reject(new Error(timedOut ? "Время ожидания истекло (20 секунд)" : "Изображение не удалось декодировать"));
        img.onload = resolve;
        img.onerror = fail;
        controller.signal.addEventListener("abort", fail, { once: true });
        if (controller.signal.aborted) { fail(); return; }
        img.src = objectURL;
      });
      if (img.naturalWidth !== check.width || img.naturalHeight !== check.height) throw new Error("Неверные размеры изображения");
      img.hidden = false;
    }
    status.textContent = `Успешно: загружено ${data.byteLength.toLocaleString("ru-RU")} байт${img ? ", изображение открывается" : ", содержимое верное"}.`;
    status.className = "ok";
    return true;
  } catch (error) {
    status.textContent = timedOut ? "Ошибка: время ожидания истекло (20 секунд)." : `Ошибка: ${error.message}. Проверьте сеть и повторите попытку.`;
    status.className = "error";
    return false;
  } finally {
    clearTimeout(timer);
    if (img) { img.onload = null; img.onerror = null; }
    if (objectURL) URL.revokeObjectURL(objectURL);
  }
}
async function runChecks() {
  button.disabled = true;
  summary.className = "";
  summary.textContent = "Проверка трёх ресурсов… Подождите до 20 секунд.";
  const results = await Promise.all(checks.map(checkResource));
  const passed = results.filter(Boolean).length;
  summary.textContent = passed === checks.length
    ? "Все 3 проверки успешны в этой сети сейчас."
    : `Успешно ${passed} из 3. Часть ресурсов не загрузилась — подробности ниже.`;
  summary.className = passed === checks.length ? "ok" : "error";
  button.disabled = false;
}
button.addEventListener("click", runChecks);
runChecks();
