'use strict';

/**
 * New Relic agent configuration
 * This file configures the New Relic Node.js agent
 */

exports.config = {
  /**
   * Application name
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'Headless-DMS'],

  /**
   * License key for New Relic
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY || '',

  /**
   * Logging configuration
   */
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    enabled: process.env.NEW_RELIC_ENABLED !== 'false',
  },

  /**
   * Distributed tracing configuration
   */
  distributed_tracing: {
    enabled: process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED !== 'false',
  },

  /**
   * Transaction tracer configuration
   */
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 5.0,
    record_sql: 'obfuscated',
    explain_threshold: 0.5,
    stack_trace_threshold: 0.5,
  },

  /**
   * Error collector configuration
   */
  error_collector: {
    enabled: true,
    capture_events: true,
    ignore_status_codes: [404, 405, 410, 501],
  },

  /**
   * Browser monitoring configuration
   */
  browser_monitoring: {
    enable: false, // Disabled for headless application
  },

  /**
   * Transaction naming configuration
   */
  transaction_naming: {
    precedence: ['framework', 'url'],
  },

  /**
   * Rules for transaction naming
   */
  rules: {
    name: [
      {
        pattern: '/auth/login',
        name: 'POST /auth/login',
      },
      {
        pattern: '/auth/register',
        name: 'POST /auth/register',
      },
      {
        pattern: '/documents/upload',
        name: 'POST /documents/upload',
      },
      {
        pattern: '/documents/:id/download',
        name: 'GET /documents/:id/download',
      },
      {
        pattern: '/documents/:id',
        name: 'GET /documents/:id',
      },
    ],
  },

  /**
   * Attributes configuration
   */
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-api-key',
      'response.headers.set-cookie',
      'response.headers.x-powered-by',
    ],
  },

  /**
   * Custom instrumentation configuration
   */
  custom_instrumentation: {
    enabled: true,
  },

  /**
   * Security configuration
   */
  security: {
    hide_attributes: [
      'request.headers.authorization',
      'request.headers.cookie',
      'request.headers.x-api-key',
    ],
  },

  /**
   * High security mode (for production)
   */
  high_security: process.env.NODE_ENV === 'production',

  /**
   * Application settings
   */
  application_logging: {
    forwarding: {
      enabled: true,
      max_samples_stored: 1000,
    },
    metrics: {
      enabled: true,
    },
  },

  /**
   * Infrastructure agent configuration
   */
  infrastructure: {
    enabled: true,
  },

  /**
   * Process host display name
   */
  process_host: {
    display_name: process.env.NEW_RELIC_PROCESS_HOST || 'Headless-DMS-Process',
  },

  /**
   * Serverless mode (disabled for this application)
   */
  serverless_mode: {
    enabled: false,
  },

  /**
   * Infinite tracing configuration
   */
  infinite_tracing: {
    trace_observer: {
      host: process.env.NEW_RELIC_TRACE_OBSERVER_HOST || '',
      port: process.env.NEW_RELIC_TRACE_OBSERVER_PORT || 443,
    },
  },

  /**
   * APM configuration
   */
  apm: {
    enabled: true,
    port: process.env.NEW_RELIC_APM_PORT || 3000,
  },

  /**
   * Custom metrics configuration
   */
  custom_metrics: {
    enabled: true,
  },

  /**
   * Datastore tracer configuration
   */
  datastore_tracer: {
    database_name_reporting: {
      enabled: true,
    },
    instance_reporting: {
      enabled: true,
    },
  },

  /**
   * External tracer configuration
   */
  external_tracer: {
    enabled: true,
  },

  /**
   * Message tracer configuration
   */
  message_tracer: {
    enabled: true,
  },

  /**
   * Promise tracer configuration
   */
  promise_tracer: {
    enabled: true,
  },

  /**
   * Slow query configuration
   */
  slow_query: {
    enabled: true,
    threshold: 0.5,
  },

  /**
   * Thread profiler configuration
   */
  thread_profiler: {
    enabled: true,
  },

  /**
   * Utilization configuration
   */
  utilization: {
    detect_aws: true,
    detect_azure: true,
    detect_gcp: true,
    detect_docker: true,
    detect_kubernetes: true,
  },
};
