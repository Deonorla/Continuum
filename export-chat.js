#!/usr/bin/env node
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const { messages = [] } = JSON.parse(Buffer.concat(chunks).toString());
  const md = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `## ${m.role === 'user' ? '👤 You' : '🤖 Kiro'}\n\n${
      Array.isArray(m.content)
        ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : m.content
    }`)
    .join('\n\n---\n\n');
  process.stdout.write(md);
});
