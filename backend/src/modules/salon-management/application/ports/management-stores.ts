import type {
  Business,
  BusinessInput,
  SalonService,
  ServiceInput,
  Staff,
  StaffInput,
  Hours,
  WeeklyInterval,
  ScheduleException,
  ExceptionInput,
  Page,
  PageQuery,
  WriteCommand,
} from '../../domain/management.types.js';
export abstract class BusinessStore {
  abstract list(actor: string, query: PageQuery): Promise<Page<Business>>;
  abstract get(actor: string, business: string): Promise<Business>;
  abstract create(command: WriteCommand, input: BusinessInput): Promise<Business>;
  abstract update(command: WriteCommand, input: BusinessInput): Promise<Business>;
}
export abstract class CatalogStore {
  abstract list(actor: string, business: string, query: PageQuery): Promise<Page<SalonService>>;
  abstract get(actor: string, business: string, id: string): Promise<SalonService>;
  abstract create(command: WriteCommand, input: ServiceInput): Promise<SalonService>;
  abstract update(
    command: WriteCommand,
    id: string,
    input: ServiceInput,
    active: boolean,
  ): Promise<SalonService>;
}
export abstract class TeamStore {
  abstract list(actor: string, business: string, query: PageQuery): Promise<Page<Staff>>;
  abstract get(actor: string, business: string, id: string): Promise<Staff>;
  abstract create(command: WriteCommand, input: StaffInput): Promise<Staff>;
  abstract update(
    command: WriteCommand,
    id: string,
    input: StaffInput,
    active: boolean,
  ): Promise<Staff>;
}
export abstract class ScheduleStore {
  abstract hours(actor: string, business: string, staff: string | null): Promise<Hours>;
  abstract replaceHours(
    command: WriteCommand,
    staff: string | null,
    intervals: WeeklyInterval[],
  ): Promise<Hours>;
  abstract exceptions(
    actor: string,
    business: string,
    query: PageQuery,
  ): Promise<Page<ScheduleException>>;
  abstract exception(actor: string, business: string, id: string): Promise<ScheduleException>;
  abstract createException(
    command: WriteCommand,
    input: ExceptionInput,
  ): Promise<ScheduleException>;
  abstract updateException(
    command: WriteCommand,
    id: string,
    input: ExceptionInput | null,
    remove: boolean,
  ): Promise<ScheduleException>;
}
