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
  // Scan all route files for JSDoc annotations
  apis: ['./src/routes/**/*.ts'],
});

export function createSwaggerRouter(): Router {
  const router = createRouter();
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(spec));
  return router;
}
