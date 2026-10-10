import { expect, it } from 'vitest';
import { renderMarkdown } from './markdown';
it('renders Markdown and removes executable HTML and dangerous links', () => {
  const html = renderMarkdown(
    '# Heading\n\n**Bold**\n\n<script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">click</a><svg onload="alert(1)"></svg><iframe src="https://example.com"></iframe>',
  );
  expect(html).toContain('<h1>Heading</h1>');
  expect(html).toContain('<strong>Bold</strong>');
  expect(html).not.toMatch(/<script|onerror|javascript:|<svg|onload|<iframe/);
});
