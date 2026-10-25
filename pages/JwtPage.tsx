import React, { useState } from 'react';
import JwtDecoder from '../components/JwtDecoder';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/jwt-decoder')!;

const JwtPage: React.FC = () => {
  // The token lives in sessionStorage (gone when the tab closes) and the keys
  // never leave memory. The previous build wrote the signing secret and the RSA
  // private key straight into localStorage, where they outlived the session on
  // whatever machine the tool was opened on.
  const [token, setToken] = useLocalStorageState('jwtToken', '', { area: 'session', maxChars: 100_000 });
  const [secret, setSecret] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Decode and verify JSON Web Tokens</h2>
          <p>
            Signature verification uses the browser’s own Web Crypto API, so the secret and the
            private key you paste are never sent anywhere — and, unlike the inputs on the other
            tools here, they are never written to disk either. The token itself is kept only until
            you close the tab.
          </p>
          <h3>What the security review flags</h3>
          <ul>
            <li>
              <code>alg: none</code>, which means the token is unsigned and can be forged.
            </li>
            <li>An expired token, or one whose <code>nbf</code> is still in the future.</li>
            <li>A missing <code>exp</code>, so the token never stops being valid.</li>
            <li>Weak HMAC secrets, and sensitive-looking claims in the payload.</li>
          </ul>
          <p>
            Remember that a JWT payload is only Base64url-encoded, not encrypted. Anyone holding
            the token can read it.
          </p>
        </>
      }
    >
      <JwtDecoder
        initialToken={token}
        onTokenChange={setToken}
        initialSecret={secret}
        onSecretChange={setSecret}
        initialPublicKey={publicKey}
        onPublicKeyChange={setPublicKey}
        initialPrivateKey={privateKey}
        onPrivateKeyChange={setPrivateKey}
      />
    </ToolShell>
  );
};

export default JwtPage;
