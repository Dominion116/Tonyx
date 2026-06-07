import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Router } from 'express';
import { Router as createRouter } from 'express';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tonyx API',
      version: '1.0.0',
      description: 'Autonomous yield optimisation agent for the TON ecosystem.',
    },
    servers: [{ url: '/api', description: 'API root' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Scan compiled route files for JSDoc annotations. `__dirname` and the
  // running file's extension adapt this to both `tsx` (src/*.ts) and the
  // compiled build (dist/*.js) — a hardcoded `./src/**/*.ts` glob matches
  // nothing once the app runs from `dist`, leaving the spec empty.
  apis: [`${__dirname}/routes/**/*.${__filename.endsWith('.ts') ? 'ts' : 'js'}`],
});

export function createSwaggerRouter(): Router {
  const router = createRouter();
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(spec));
  return router;
}
