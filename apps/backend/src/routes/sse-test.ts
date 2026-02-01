import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface SSEQueryParams {
  interval?: string;
  count?: string;
  message?: string;
}

export async function sseTestRoutes(fastify: FastifyInstance) {
  // Simple SSE stream that sends events every second
  fastify.get('/sse/test', async (
    request: FastifyRequest<{ Querystring: SSEQueryParams }>,
    reply: FastifyReply
  ) => {
    const interval = parseInt(request.query.interval || '1000');
    const maxCount = parseInt(request.query.count || '10');
    const customMessage = request.query.message || 'Test event';

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    let count = 0;
    const startTime = Date.now();

    // Send initial connection event
    reply.raw.write(`event: connected\n`);
    reply.raw.write(`data: ${JSON.stringify({ message: 'SSE stream connected', timestamp: new Date().toISOString() })}\n\n`);

    const intervalId = setInterval(() => {
      count++;

      const event = {
        id: count,
        message: `${customMessage} #${count}`,
        timestamp: new Date().toISOString(),
        elapsed: Date.now() - startTime,
      };

      // Send message event
      reply.raw.write(`id: ${count}\n`);
      reply.raw.write(`event: message\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

      // Close stream after reaching max count
      if (count >= maxCount) {
        clearInterval(intervalId);
        
        // Send completion event
        reply.raw.write(`event: complete\n`);
        reply.raw.write(`data: ${JSON.stringify({ 
          message: 'Stream complete', 
          totalEvents: count,
          duration: Date.now() - startTime 
        })}\n\n`);
        
        reply.raw.end();
      }
    }, interval);

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(intervalId);
      reply.raw.end();
    });
  });

  fastify.get('/sse/text', async (
    request: FastifyRequest<{ Querystring: SSEQueryParams }>,
    reply: FastifyReply
  ) => {
    const interval = parseInt(request.query.interval || '1000');
    const maxCount = parseInt(request.query.count || '10');
    const customMessage = request.query.message || 'Test event';

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    let count = 0;
    const startTime = Date.now();

    // Send initial connection event
    reply.raw.write(`event: connected\n`);
    reply.raw.write(`data: "SSE stream connected"\n\n`);

    const intervalId = setInterval(() => {
      count++;

      // Send message event
      reply.raw.write(`id: ${count}\n`);
      reply.raw.write(`event: message\n`);
      reply.raw.write(`data: "Test event #${count}"\n\n`);

      // Close stream after reaching max count
      if (count >= maxCount) {
        clearInterval(intervalId);
        
        // Send completion event
        reply.raw.write(`event: complete\n`);
        reply.raw.write(`data: "Stream complete"\n\n`);
        
        reply.raw.end();
      }
    }, interval);

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(intervalId);
      reply.raw.end();
    });
  });

  // SSE stream with random data (stock prices simulation)
  fastify.get('/sse/stocks', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    const prices: Record<string, number> = {
      AAPL: 150.00,
      GOOGL: 2800.00,
      MSFT: 300.00,
      AMZN: 3300.00,
      TSLA: 800.00,
    };

    reply.raw.write(`event: connected\n`);
    reply.raw.write(`data: ${JSON.stringify({ message: 'Stock price stream connected' })}\n\n`);

    const intervalId = setInterval(() => {
      const symbol = stocks[Math.floor(Math.random() * stocks.length)];
      const change = (Math.random() - 0.5) * 10;
      prices[symbol] = Math.max(0, prices[symbol] + change);

      const event = {
        symbol,
        price: prices[symbol].toFixed(2),
        change: change.toFixed(2),
        timestamp: new Date().toISOString(),
      };

      reply.raw.write(`event: stock-update\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }, 2000);

    request.raw.on('close', () => {
      clearInterval(intervalId);
      reply.raw.end();
    });
  });

  // SSE stream with progress updates
  fastify.get('/sse/progress', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const tasks = [
      'Initializing...',
      'Loading configuration...',
      'Connecting to database...',
      'Fetching data...',
      'Processing records...',
      'Validating results...',
      'Generating report...',
      'Finalizing...',
      'Complete!',
    ];

    let currentTask = 0;

    reply.raw.write(`event: started\n`);
    reply.raw.write(`data: ${JSON.stringify({ message: 'Process started' })}\n\n`);

    const intervalId = setInterval(() => {
      const progress = ((currentTask + 1) / tasks.length) * 100;

      const event = {
        step: currentTask + 1,
        total: tasks.length,
        progress: Math.round(progress),
        message: tasks[currentTask],
        timestamp: new Date().toISOString(),
      };

      reply.raw.write(`event: progress\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

      currentTask++;

      if (currentTask >= tasks.length) {
        clearInterval(intervalId);
        
        reply.raw.write(`event: complete\n`);
        reply.raw.write(`data: ${JSON.stringify({ message: 'All tasks completed!' })}\n\n`);
        
        reply.raw.end();
      }
    }, 1500);

    request.raw.on('close', () => {
      clearInterval(intervalId);
      reply.raw.end();
    });
  });
}
