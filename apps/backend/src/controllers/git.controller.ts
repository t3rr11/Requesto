import { FastifyPluginAsync } from 'fastify';
import { GitService } from '../services/git.service';

interface Options {
  gitService: GitService;
}

const gitController: FastifyPluginAsync<Options> = async (server, opts) => {
  const { gitService } = opts;

  server.get('/git/check', async () => {
    return gitService.check();
  });

  server.get('/git/status', async () => {
    return gitService.getStatus();
  });

  server.post('/git/init', async () => {
    return gitService.init();
  });

  server.post<{ Body: { message: string } }>('/git/commit', async (request, reply) => {
    const { message } = request.body;
    if (!message || !message.trim()) {
      return reply.code(400).send({ error: 'Commit message is required' });
    }
    return gitService.commit(message);
  });

  server.post('/git/push', async () => {
    return gitService.push();
  });

  server.post('/git/pull', async () => {
    return gitService.pull();
  });

  server.post<{ Body: { strategy: 'ours' | 'theirs'; file?: string } }>('/git/resolve', async (request, reply) => {
    const { strategy, file } = request.body;
    if (!strategy || !['ours', 'theirs'].includes(strategy)) {
      return reply.code(400).send({ error: 'Strategy must be "ours" or "theirs"' });
    }
    return gitService.resolve(strategy, file);
  });

  server.get<{ Querystring: { file?: string } }>('/git/diff', async (request) => {
    return gitService.getDiff(request.query.file);
  });

  server.get<{ Querystring: { limit?: string } }>('/git/log', async (request) => {
    const limit = Math.min(parseInt(request.query.limit || '20', 10) || 20, 100);
    return gitService.getLog(limit);
  });

  server.get('/git/remotes', async () => {
    const remotes = await gitService.getRemotes() as Array<{ name: string; refs: { fetch: string; push: string } }>;
    return {
      remotes: remotes.map((r) => ({
        name: r.name,
        fetchUrl: r.refs.fetch,
        pushUrl: r.refs.push,
      })),
    };
  });

  server.post<{ Body: { name: string; url: string } }>('/git/remote', async (request, reply) => {
    const { name, url } = request.body;
    if (!name || !url) {
      return reply.code(400).send({ error: 'name and url are required' });
    }
    return gitService.addRemote(name, url);
  });
};

export default gitController;
