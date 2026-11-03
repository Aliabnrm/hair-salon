// Test-only process entry. Production never imports this file or reads this clock variable.
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../dist/app.module.js';
import { configureApplication } from '../../dist/app.setup.js';
import { Clock } from '../../dist/modules/salon-management/application/ports/clock.js';

if (process.env.NODE_ENV !== 'test' || !process.env.AVAILABILITY_TEST_NOW)
  throw new Error('This entry requires the owned availability test fixture.');
const now = new Date(process.env.AVAILABILITY_TEST_NOW);
if (!Number.isFinite(now.getTime())) throw new Error('Invalid fixture clock.');
const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(Clock)
  .useValue({ now: () => new Date(now) })
  .compile();
const app = module.createNestApplication({ logger: false });
await configureApplication(app);
await app.listen(app.get(ConfigService).get('PORT'), '127.0.0.1');
app.enableShutdownHooks();
