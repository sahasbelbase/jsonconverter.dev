import React from 'react';
import Tokenizer from '../components/Tokenizer';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/token-counter')!;

const TokenizerPage: React.FC = () => {
  const [value, setValue] = useLocalStorageState('tokenizerInput', '', { maxChars: 500_000 });

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>What a token actually is</h2>
          <p>
            Models do not read characters or words — they read tokens, chunks produced by a
            byte-pair encoder. Common English words are usually one token; rarer words split into
            pieces; and whitespace, punctuation and non-Latin scripts all cost differently. English
            prose runs around four characters per token, but code, JSON and non-English text can be
            far denser.
          </p>
          <h3>Exact counts and estimated ones</h3>
          <p>
            For OpenAI models the count here is exact: the text is run through the same tokenizer
            the API uses — <code>o200k_base</code> for GPT-4o and everything after it,{' '}
            <code>cl100k_base</code> for GPT-4 Turbo and GPT-3.5.
          </p>
          <p>
            For Claude models the count is an estimate. Anthropic does not publish a tokenizer you
            can run in a browser, so the text is encoded with cl100k and scaled. Claude 4.7 and
            later use a newer tokenizer that produces roughly 30% more tokens for the same text,
            which is why the newer models carry a larger factor. When the exact number matters, use
            Anthropic’s count-tokens API endpoint.
          </p>
          <h3>Reading the cost estimate</h3>
          <p>
            Input cost is computed from the text you pasted. Output cost is a guess you control —
            change the expected output tokens to match the length of reply you expect. Neither
            accounts for prompt caching (which can cut input cost by an order of magnitude on a
            repeated prefix) or batch processing (roughly half price, in exchange for latency).
          </p>
        </>
      }
    >
      <Tokenizer value={value} onChange={setValue} />
    </ToolShell>
  );
};

export default TokenizerPage;
