import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchTemplates,
  githubIssueUrl,
  normalizeRepository,
  parseTemplate,
} from './github';
afterEach(() => vi.unstubAllGlobals());
describe('repository and handoff', () => {
  it('normalizes repositories and rejects invalid paths', () => {
    expect(normalizeRepository(' Owner/Repo.name ')).toBe('owner/repo.name');
    for (const value of [
      'https://github.com/a/b',
      'a/b/c',
      'a/b?x=1',
      'a/..',
      '/repo',
      'a b/repo',
    ])
      expect(() => normalizeRepository(value)).toThrow();
  });
  it('preserves Unicode and special characters through URL encoding', () => {
    const draft = {
      repository: 'owner/repo',
      title: '不具合 & # + ?',
      body: '## Test\nこんにちは\n&body=oops %',
    };
    const url = new URL(githubIssueUrl(draft));
    expect(url.origin + url.pathname).toBe(
      'https://github.com/owner/repo/issues/new',
    );
    expect(url.searchParams.get('title')).toBe(draft.title);
    expect(url.searchParams.get('body')).toBe(draft.body);
  });
});
describe('Markdown templates', () => {
  it('parses YAML quotes, multiline descriptions and CRLF, removing front matter only', () => {
    const result = parseTemplate(
      '---\r\nname: "Bug: report"\r\nabout: >-\r\n  First line\r\n  second line\r\ntitle: "[Bug] "\r\n---\r\n\r\n## Details\r\n---\r\n',
      'bug.md',
    );
    expect(result).toMatchObject({
      name: 'Bug: report',
      about: 'First line second line',
      title: '[Bug] ',
      body: '\n## Details\n---\n',
    });
  });
  it('supports plain Markdown and ignores non-string metadata', () => {
    expect(parseTemplate('# Details', 'plain.md')).toMatchObject({
      name: 'plain.md',
      title: '',
      body: '# Details',
    });
    expect(
      parseTemplate('---\nname: 1\ntitle: [a]\n---\nBody', 'x.md'),
    ).toMatchObject({ name: 'x.md', title: '', body: 'Body' });
    expect(() => parseTemplate('---\nname: [bad\n---\nBody', 'x.md')).toThrow();
  });
  it('fetches only Markdown files and keeps valid templates when one fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { type: 'file', name: 'bug.md' },
            { type: 'file', name: 'broken.md' },
            { type: 'file', name: 'form.yml' },
            { type: 'dir', name: 'folder.md' },
          ]),
        ),
      )
      .mockResolvedValueOnce(new Response('---\nname: Bug\n---\n## Reproduce'))
      .mockResolvedValueOnce(new Response('', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchTemplates('owner/repo');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].body).toBe('## Reproduce');
    expect(result.warning).toContain('Some templates');
  });
  it('allows no-template fallback for missing templates and reports rate limits', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 404 }))
        .mockResolvedValueOnce(new Response('', { status: 403 })),
    );
    expect((await fetchTemplates('owner/repo')).templates).toEqual([]);
    await expect(fetchTemplates('owner/repo')).rejects.toThrow('limited');
  });
});
