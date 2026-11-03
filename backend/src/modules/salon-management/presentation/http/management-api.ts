import { applyDecorators, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiExtraModels,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  SessionAuthGuard,
  CookieMutationGuard,
  IdentityExceptionFilter,
} from '../../../identity/public.js';
import { ApiErrorDto } from '../../../../common/http/api-error.js';
import * as publicationDto from './dto/publication.dto.js';
import * as dto from './dto/management.dto.js';
export function ManagementApi() {
  return applyDecorators(
    UseGuards(SessionAuthGuard, CookieMutationGuard),
    UseFilters(IdentityExceptionFilter),
    ApiCookieAuth('session'),
    ApiTags('salon-management'),
    ApiExtraModels(...Object.values(dto), ...Object.values(publicationDto)),
    ...[400, 401, 403, 404, 409, 413, 415, 422, 428, 429, 503].map((status) =>
      ApiResponse({ status, type: ApiErrorDto }),
    ),
  );
}
export function resultSchema(model: Function, list = false) {
  const item = { $ref: getSchemaPath(model) };
  return {
    type: 'object' as const,
    required: ['data', 'meta'],
    properties: {
      data: list
        ? {
            type: 'object' as const,
            required: ['items', 'next_cursor'],
            properties: {
              items: { type: 'array' as const, items: item },
              next_cursor: { type: 'string' as const, nullable: true },
            },
          }
        : item,
      meta: {
        type: 'object' as const,
        required: ['request_id'],
        properties: { request_id: { type: 'string' as const } },
      },
    },
  };
}
