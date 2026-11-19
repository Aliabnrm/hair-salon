import { validLocalDate } from './local-date';
/** Resolve the IANA offset, then round-trip; never use the browser timezone or a fixed Iran offset. */
export function tehranInstant(date: string, time: string): string {
  if (!validLocalDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error('روز و ساعت معتبر انتخاب کنید.');
  const desired = Date.parse(`${date}T${time}:00Z`);
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  function wall(at: number) {
    const p = Object.fromEntries(f.formatToParts(new Date(at)).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`;
  }
  let result = desired;
  for (let i = 0; i < 3; i++) result += desired - Date.parse(wall(result));
  if (wall(result) !== `${date}T${time}:00Z`) throw new Error('این ساعت محلی معتبر نیست.');
  return new Date(result).toISOString();
}
