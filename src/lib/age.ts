/** Calcula a idade completa (anos) a partir de uma data ISO yyyy-mm-dd, na data de referência. */
export function calcAge(birth: string | undefined | null, at: Date = new Date()): number | null {
  if (!birth) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  let age = at.getFullYear() - y;
  const month = at.getMonth() + 1;
  if (month < mo || (month === mo && at.getDate() < d)) age--;
  return age < 0 ? null : age;
}

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}