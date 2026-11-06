import type { Appointment } from './booking.types';
export const statusLabels: Record<Appointment['status'], string> = {
  confirmed: 'قطعی',
  cancelled: 'لغوشده',
  completed: 'انجام‌شده',
  no_show: 'عدم حضور',
};
export const statusTitles: Record<Appointment['status'], string> = {
  confirmed: 'نوبت شما قطعی است',
  cancelled: 'این نوبت لغو شده است',
  completed: 'این نوبت انجام شده است',
  no_show: 'برای این نوبت عدم حضور ثبت شده است',
};
