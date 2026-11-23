import React from 'react';

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-[#182230]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function RichTextRenderer({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-sm text-[#516072] italic">
        Belum ada uraian teks materi.
      </p>
    );
  }

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`${keyPrefix}-ul`} className="space-y-2 my-3 pl-5 list-disc marker:text-[#54BCEB]">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-[15px] leading-relaxed text-[#2F3B4B]">
            {renderInlineBold(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`b-${idx}`);
      return;
    }
    if (line.startsWith('## ')) {
      flushList(`h2-${idx}`);
      blocks.push(
        <h3
          key={`h2-${idx}`}
          className="font-display text-xl font-bold text-[#182230] mt-6 mb-2.5 first:mt-0"
        >
          {line.slice(3)}
        </h3>
      );
      return;
    }
    if (line.startsWith('# ')) {
      flushList(`h1-${idx}`);
      blocks.push(
        <h2
          key={`h1-${idx}`}
          className="font-display text-2xl font-bold text-[#182230] mt-6 mb-3 first:mt-0"
        >
          {line.slice(2)}
        </h2>
      );
      return;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.slice(2));
      return;
    }
    flushList(`p-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="text-[15.5px] leading-[1.7] text-[#2F3B4B] my-2.5">
        {renderInlineBold(line)}
      </p>
    );
  });

  flushList('end');

  return <div className="max-w-[70ch]">{blocks}</div>;
}
