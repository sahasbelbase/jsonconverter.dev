import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from './MonacoEditor';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, Lock, 
  AlertCircle, Key, RefreshCw, Copy, XCircle, Info, FileJson,
  Check, FileCode, FileKey, Unlock, ChevronDown, HelpCircle
} from 'lucide-react';

interface JwtDecoderProps {
  initialToken: string;
  onTokenChange: (val: string) => void;
  initialSecret: string;
  onSecretChange: (val: string) => void;
  initialPublicKey?: string;
  onPublicKeyChange?: (val: string) => void;
  initialPrivateKey?: string;
  onPrivateKeyChange?: (val: string) => void;
}

type AlgoType = 'HS256' | 'RS256' | 'ES256' | 'none' | 'unsupported';
type ValidationStatus = 'valid' | 'invalid' | 'unknown' | 'loading';

interface SecurityWarning {
  level: 'critical' | 'warning' | 'info';
  message: string;
  detail?: string;
}

// --- Utils ---

const base64UrlEncode = (str: string): string => {
  // UTF-8 friendly encoding
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
          return String.fromCharCode(parseInt(p1, 16));
  }))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
};

const base64UrlDecode = (str: string): string => {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    return decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    throw new Error('Invalid Base64URL encoding');
  }
};

const str2ab = (str: string) => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

const pemToArrayBuffer = (pem: string): ArrayBuffer | null => {
  try {
    // Remove headers, footers, and newlines
    const b64 = pem.replace(/(-----(BEGIN|END) [A-Z ]+-----|\n|\r|\s)/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    return null;
  }
};

// --- Sub-Components ---

const SecurityAnalysis: React.FC<{ warnings: SecurityWarning[], status: ValidationStatus }> = ({ warnings, status }) => {
  if (warnings.length === 0 && status !== 'invalid') return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-dark-secondary">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Shield size={16} className="text-gray-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Security Analysis</h3>
      </div>
      <div className="p-4 space-y-3">
        {status === 'invalid' && (
           <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
             <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
             <div>
               <h4 className="text-sm font-bold text-red-800 dark:text-red-200">Invalid Signature</h4>
               <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                 The token's signature does not match its content. The token may have been tampered with or the secret/key is incorrect.
               </p>
             </div>
           </div>
        )}
        
        {warnings.map((w, idx) => (
          <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
            w.level === 'critical' 
              ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/50' 
              : w.level === 'warning'
                ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/50'
                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/50'
          }`}>
            {w.level === 'critical' ? (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            ) : w.level === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className={`text-sm font-bold ${
                w.level === 'critical' ? 'text-red-800 dark:text-red-200' : 
                w.level === 'warning' ? 'text-yellow-800 dark:text-yellow-200' : 
                'text-blue-800 dark:text-blue-200'
              }`}>{w.message}</h4>
              {w.detail && <p className="text-xs opacity-80 mt-1">{w.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Timeline: React.FC<{ iat?: number, nbf?: number, exp?: number }> = ({ iat, nbf, exp }) => {
  if (!iat && !exp && !nbf) return null;

  const now = Math.floor(Date.now() / 1000);
  
  // Determine range
  const times = [iat, nbf, exp, now].filter((t): t is number => !!t);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min || 100; // avoid div by 0

  const getPos = (val?: number) => {
    if (!val) return 0;
    return ((val - min) / range) * 100;
  };

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-dark-secondary mt-4">
       <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Clock size={16} className="text-gray-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Token Timeline</h3>
      </div>
      <div className="p-6">
         <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-full my-4">
            {/* Active Range Bar */}
            {iat && exp && (
               <div 
                 className="absolute top-0 bottom-0 bg-green-200 dark:bg-green-900/40 rounded-full"
                 style={{ left: `${getPos(iat)}%`, width: `${getPos(exp) - getPos(iat)}%` }}
               />
            )}
            
            {/* Markers */}
            {iat && (
               <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white dark:border-dark shadow cursor-help z-10 group" style={{ left: `${getPos(iat)}%`, marginLeft: '-6px' }}>
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-20">
                    <div className="font-bold">Issued At (iat)</div>
                    <div>{formatDate(iat)} {formatTime(iat)}</div>
                 </div>
               </div>
            )}
            
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-dark shadow cursor-help z-20 group" style={{ left: `${getPos(now)}%`, marginLeft: '-6px' }}>
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-20">
                    <div className="font-bold">Current Time</div>
                    <div>{formatDate(now)} {formatTime(now)}</div>
                 </div>
            </div>

            {exp && (
               <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-dark shadow cursor-help z-10 group" style={{ left: `${getPos(exp)}%`, marginLeft: '-6px' }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-20">
                    <div className="font-bold">Expires (exp)</div>
                    <div>{formatDate(exp)} {formatTime(exp)}</div>
                 </div>
               </div>
            )}
         </div>
         <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">
            <span>Start</span>
            <span>Duration: {exp && iat ? Math.round((exp - iat)/60) + ' min' : 'N/A'}</span>
            <span>End</span>
         </div>
      </div>
    </div>
  );
};


// --- Main Component ---

const JwtDecoder: React.FC<JwtDecoderProps> = ({ 
  initialToken, onTokenChange, 
  initialSecret, onSecretChange,
  initialPublicKey, onPublicKeyChange,
  initialPrivateKey, onPrivateKeyChange
}) => {
  // --- State ---
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');
  const [token, setToken] = useState(initialToken);
  
  // Parsed JSON text (for editors)
  const [headerJson, setHeaderJson] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const [payloadJson, setPayloadJson] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  
  // Keys
  const [secret, setSecret] = useState(initialSecret);
  const [publicKey, setPublicKey] = useState(initialPublicKey || '');
  const [privateKey, setPrivateKey] = useState(initialPrivateKey || '');
  
  // Status
  const [algo, setAlgo] = useState<AlgoType>('HS256');
  const [status, setStatus] = useState<ValidationStatus>('unknown');
  const [warnings, setWarnings] = useState<SecurityWarning[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [signingError, setSigningError] = useState<string | null>(null);
  
  // Validation Errors
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  
  // Internal flags to prevent loops
  const isUpdatingFromToken = useRef(false);
  const isUpdatingFromJson = useRef(false);

  // --- Effects ---

  // 1. Sync Props to Parent
  useEffect(() => { onSecretChange(secret); }, [secret, onSecretChange]);
  useEffect(() => { if(onPublicKeyChange) onPublicKeyChange(publicKey); }, [publicKey, onPublicKeyChange]);
  useEffect(() => { if(onPrivateKeyChange) onPrivateKeyChange(privateKey); }, [privateKey, onPrivateKeyChange]);

  // 2. Auto-Detect Key Algorithm from Paste
  useEffect(() => {
    const keyToCheck = mode === 'encode' ? privateKey : publicKey;
    if (!keyToCheck) return;

    // Remove whitespace to make detection easier
    const cleanKey = keyToCheck.replace(/\s/g, '');
    
    // Heuristics for Algorithm
    if (cleanKey.includes('BEGINRSAPRIVATEKEY') || cleanKey.includes('BEGINRSAPUBLICKEY')) {
        if (algo !== 'RS256') setAlgo('RS256');
        setKeyError(null);
    } else if (cleanKey.includes('BEGINECPRIVATEKEY')) {
        if (algo !== 'ES256') setAlgo('ES256');
        setKeyError(null);
    }
    // Generic 'BEGIN PRIVATE KEY' or 'BEGIN PUBLIC KEY' (PKCS#8/SPKI) can be either, 
    // so we don't force switch but we clear errors.
  }, [publicKey, privateKey, mode]);

  // 3. JSON Validation
  useEffect(() => {
    try {
      if (headerJson) JSON.parse(headerJson);
      setHeaderError(null);
    } catch (e: any) {
      setHeaderError(e.message || "Invalid JSON");
    }
  }, [headerJson]);

  useEffect(() => {
    try {
      if (payloadJson) JSON.parse(payloadJson);
      setPayloadError(null);
    } catch (e: any) {
      setPayloadError(e.message || "Invalid JSON");
    }
  }, [payloadJson]);


  // 4. Token -> JSON & Algo Detection
  useEffect(() => {
    if (isUpdatingFromJson.current) return;
    
    if (!token.trim()) {
      setStatus('unknown');
      setWarnings([]);
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        // Partial or invalid token
        return; 
      }

      isUpdatingFromToken.current = true;

      const head = JSON.parse(base64UrlDecode(parts[0]));
      const body = JSON.parse(base64UrlDecode(parts[1]));
      
      setHeaderJson(JSON.stringify(head, null, 2));
      setPayloadJson(JSON.stringify(body, null, 2));
      
      // Auto-detect algo
      if (head.alg) {
        if (['HS256', 'RS256', 'ES256', 'none'].includes(head.alg)) {
          setAlgo(head.alg as AlgoType);
        } else {
          setAlgo('unsupported');
        }
      }

      // Sync to parent
      onTokenChange(token);
      
      isUpdatingFromToken.current = false;
    } catch (e) {
      console.warn("Parse error", e);
      isUpdatingFromToken.current = false;
    }
  }, [token, onTokenChange]);

  // 5. Validation Logic (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setKeyError(null); // Clear key errors at start of validation

      if (!token) return;
      const parts = token.split('.');
      if (parts.length !== 3) return;

      setStatus('loading');
      let isValid = false;
      const newWarnings: SecurityWarning[] = [];

      try {
        const header = JSON.parse(base64UrlDecode(parts[0]));
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        const signature = parts[2];
        const dataToSign = str2ab(`${parts[0]}.${parts[1]}`);

        // --- Signature Verification ---
        if (algo === 'HS256') {
            if (secret) {
                const key = await crypto.subtle.importKey(
                    'raw', str2ab(secret), 
                    { name: 'HMAC', hash: 'SHA-256' }, 
                    false, ['verify']
                );
                // Convert url-safe b64 to binary string then to array buffer
                const binSig = atob(signature.replace(/-/g, '+').replace(/_/g, '/'));
                const sigBuf = new Uint8Array(binSig.length);
                for(let i=0; i<binSig.length; i++) sigBuf[i] = binSig.charCodeAt(i);

                isValid = await crypto.subtle.verify('HMAC', key, sigBuf, dataToSign);
            }
        } else if (algo === 'RS256') {
            if (publicKey) {
                const keyBuf = pemToArrayBuffer(publicKey);
                if (keyBuf) {
                    try {
                        const key = await crypto.subtle.importKey(
                            'spki', keyBuf,
                            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
                            false, ['verify']
                        );
                        const binSig = atob(signature.replace(/-/g, '+').replace(/_/g, '/'));
                        const sigBuf = new Uint8Array(binSig.length);
                        for(let i=0; i<binSig.length; i++) sigBuf[i] = binSig.charCodeAt(i);

                        isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBuf, dataToSign);
                    } catch (e) {
                        setKeyError('Invalid Public Key for RS256');
                    }
                } else {
                    setKeyError('Invalid PEM Format');
                }
            }
        } else if (algo === 'ES256') {
             if (publicKey) {
                const keyBuf = pemToArrayBuffer(publicKey);
                if (keyBuf) {
                    try {
                        const key = await crypto.subtle.importKey(
                            'spki', keyBuf,
                            { name: 'ECDSA', namedCurve: 'P-256' },
                            false, ['verify']
                        );
                        const binSig = atob(signature.replace(/-/g, '+').replace(/_/g, '/'));
                        const sigBuf = new Uint8Array(binSig.length);
                        for(let i=0; i<binSig.length; i++) sigBuf[i] = binSig.charCodeAt(i);

                        isValid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sigBuf, dataToSign);
                    } catch (e) {
                        setKeyError('Invalid Public Key for ES256');
                    }
                } else {
                    setKeyError('Invalid PEM Format');
                }
            }
        } else if (algo === 'none') {
            isValid = true; // technically valid for none
            newWarnings.push({ level: 'critical', message: 'Unsecured JWT', detail: 'The algorithm is set to "none". This token is not signed and can be forged.' });
        }

        // --- Payload Analysis ---
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp) {
            if (payload.exp < now) {
                newWarnings.push({ level: 'warning', message: 'Token Expired', detail: `Token expired at ${new Date(payload.exp * 1000).toLocaleString()}` });
            }
        } else {
            newWarnings.push({ level: 'info', message: 'Missing Expiration (exp)', detail: 'Tokens should ideally have an expiration time to limit the window of misuse.' });
        }

        if (payload.nbf && payload.nbf > now) {
             newWarnings.push({ level: 'warning', message: 'Token Not Yet Valid (nbf)', detail: 'The "not before" time is in the future.' });
        }
        
        if (payload.iat && payload.iat > now + 300) { // 5 min skew
             newWarnings.push({ level: 'info', message: 'Issued in Future', detail: 'The "iat" claim is significantly in the future. Check clock synchronization.' });
        }

        if (!payload.iss) newWarnings.push({ level: 'info', message: 'Missing Issuer (iss)', detail: 'Recommended to verify who issued the token.' });
        if (!payload.sub) newWarnings.push({ level: 'info', message: 'Missing Subject (sub)', detail: 'Recommended to identify the subject of the token.' });

        // Update state
        setStatus(isValid ? 'valid' : 'invalid');
        setWarnings(newWarnings);

      } catch (e) {
        setStatus('invalid');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [token, secret, publicKey, algo]);

  // 6. JSON -> Token (Encode Logic)
  const updateTokenFromJson = useCallback(async () => {
     if (isUpdatingFromToken.current) return;
     if (headerError || payloadError) return; // Stop if invalid JSON
     
     isUpdatingFromJson.current = true;
     setSigningError(null);
     setKeyError(null);

     try {
         // Minimal formatting to avoid jumps
         const headerObj = JSON.parse(headerJson);
         const payloadObj = JSON.parse(payloadJson);
         
         // Ensure algo match
         headerObj.alg = algo; 
         
         const headB64 = base64UrlEncode(JSON.stringify(headerObj));
         const payloadB64 = base64UrlEncode(JSON.stringify(payloadObj));
         const unsigned = `${headB64}.${payloadB64}`;
         
         let sigB64 = '';
         
         // Signing
         if (algo === 'HS256') {
             if (secret) {
                const key = await crypto.subtle.importKey(
                    'raw', str2ab(secret), 
                    { name: 'HMAC', hash: 'SHA-256' }, 
                    false, ['sign']
                );
                const sigBuf = await crypto.subtle.sign('HMAC', key, str2ab(unsigned));
                const binStr = Array.from(new Uint8Array(sigBuf)).map(b => String.fromCharCode(b)).join('');
                sigB64 = btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
             } else {
                 setSigningError('Secret key required for HS256 signing');
             }
         } 
         else if ((algo === 'RS256' || algo === 'ES256')) {
             if (privateKey) {
                 const keyBuf = pemToArrayBuffer(privateKey);
                 if (keyBuf) {
                    try {
                        const key = await crypto.subtle.importKey(
                            'pkcs8', keyBuf,
                            algo === 'RS256' ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } : { name: 'ECDSA', namedCurve: 'P-256' },
                            false, ['sign']
                        );
                        const sigBuf = await crypto.subtle.sign(
                            algo === 'RS256' ? 'RSASSA-PKCS1-v1_5' : { name: 'ECDSA', hash: 'SHA-256' }, 
                            key, 
                            str2ab(unsigned)
                        );
                        const binStr = Array.from(new Uint8Array(sigBuf)).map(b => String.fromCharCode(b)).join('');
                        sigB64 = btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    } catch (e: any) {
                        setSigningError(`Key Error: ${e.message}`);
                        setKeyError(`Invalid ${algo} Private Key`);
                    }
                 } else {
                     setSigningError('Invalid Private Key PEM format');
                     setKeyError('Invalid PEM');
                 }
             } else {
                 setSigningError('Private Key required for signing');
             }
         } else if (algo === 'none') {
             sigB64 = '';
         }

         const newToken = `${unsigned}.${sigB64}`;
         setToken(newToken);
         onTokenChange(newToken);

     } catch(e) {
         // JSON parse error likely
     }
     isUpdatingFromJson.current = false;
  }, [headerJson, payloadJson, algo, secret, privateKey, onTokenChange, headerError, payloadError]);

  // Trigger re-sign when inputs change
  useEffect(() => {
     updateTokenFromJson();
  }, [headerJson, payloadJson, algo, secret, privateKey]);


  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getPayloadObj = () => {
    try { return JSON.parse(payloadJson); } catch { return {}; }
  };

  const renderJsonEditors = () => (
    <div className="flex flex-col gap-4 h-full">
         {/* Header */}
         <div className={`flex-[0.8] flex flex-col h-40 md:h-auto rounded-xl border ${headerError ? 'border-red-500' : 'border-red-200 dark:border-red-900/50'} bg-white dark:bg-dark-secondary shadow-sm overflow-hidden transition-colors`}>
            <div className="flex-none px-3 py-2 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Header</span>
              {headerError && <span className="text-xs text-red-500 font-medium truncate max-w-[150px]" title={headerError}>{headerError}</span>}
            </div>
            <div className="flex-1 relative min-h-[100px]">
                <MonacoEditor 
                    value={headerJson}
                    onChange={(val) => setHeaderJson(val || '{}')}
                    language="json"
                    theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                />
            </div>
         </div>

         {/* Payload */}
         <div className={`flex-1 flex flex-col h-40 md:h-auto rounded-xl border ${payloadError ? 'border-purple-500' : 'border-purple-200 dark:border-purple-900/50'} bg-white dark:bg-dark-secondary shadow-sm overflow-hidden transition-colors`}>
            <div className="flex-none px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30 flex justify-between items-center">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Payload</span>
              {payloadError && <span className="text-xs text-red-500 font-medium truncate max-w-[150px]" title={payloadError}>{payloadError}</span>}
            </div>
            <div className="flex-1 relative min-h-[150px]">
                <MonacoEditor 
                    value={payloadJson}
                    onChange={(val) => setPayloadJson(val || '{}')}
                    language="json"
                    theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                />
            </div>
         </div>
    </div>
  );

  const renderConfigAndAnalysis = () => (
      <div className="flex flex-col gap-6 h-full overflow-y-auto">
          {/* Verification / Signature Config */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-dark-secondary shadow-sm overflow-hidden shrink-0">
             <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Lock size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Signature Configuration</h3>
                </div>
                
                {/* Algorithm Selector Dropdown */}
                <div className="relative">
                    <select 
                      value={algo}
                      onChange={(e) => setAlgo(e.target.value as AlgoType)}
                      className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <option value="HS256">HS256 (HMAC)</option>
                      <option value="RS256">RS256 (RSA)</option>
                      <option value="ES256">ES256 (ECDSA)</option>
                      <option value="none">none (Unsecured)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <ChevronDown size={14} />
                    </div>
                </div>
             </div>
             
             <div className="p-4 grid grid-cols-1 gap-4">
                {algo === 'HS256' && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Secret (HMAC Key)</label>
                        <div className="relative">
                            <input 
                                type="text"
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="Enter secret to verify/sign..."
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                            />
                            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                )}

                {(algo === 'RS256' || algo === 'ES256') && (
                    <div className="grid grid-cols-1 gap-4">
                        {mode === 'decode' && (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                  <label className="text-xs font-semibold text-gray-500 uppercase">Public Key (Verify)</label>
                                  {keyError && <span className="text-xs text-red-500 font-bold">{keyError}</span>}
                                </div>
                                <textarea 
                                    className={`w-full h-32 p-3 bg-gray-50 dark:bg-gray-800 border ${keyError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-colors`}
                                    placeholder={`-----BEGIN PUBLIC KEY-----\n...`}
                                    value={publicKey}
                                    onChange={(e) => setPublicKey(e.target.value)}
                                />
                            </div>
                        )}
                        {mode === 'encode' && (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                   <label className="text-xs font-semibold text-gray-500 uppercase">Private Key (Sign)</label>
                                   {keyError && <span className="text-xs text-red-500 font-bold">{keyError}</span>}
                                </div>
                                <textarea 
                                    className={`w-full h-32 p-3 bg-gray-50 dark:bg-gray-800 border ${keyError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-colors`}
                                    placeholder={`-----BEGIN PRIVATE KEY-----\n...`}
                                    value={privateKey}
                                    onChange={(e) => setPrivateKey(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                )}

                {algo === 'none' && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-3">
                         <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                         <div>
                             <h4 className="text-sm font-bold text-red-700 dark:text-red-200">Insecure Configuration</h4>
                             <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                 The "none" algorithm indicates the token is not signed. It provides no integrity protection and can be easily forged.
                             </p>
                         </div>
                    </div>
                )}
             </div>
             
             {/* Verification Footer */}
             {mode === 'decode' && (
                <div className={`px-4 py-2 border-t flex justify-between items-center text-xs ${
                    algo === 'none' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300' :
                    status === 'valid' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-300' :
                    status === 'invalid' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300' :
                    'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                }`}>
                    <div className="flex items-center gap-2 font-medium">
                        {algo === 'none' ? (
                            <>
                                <Unlock size={14} />
                                <span>Unsecured Token (No Signature)</span>
                            </>
                        ) : status === 'valid' ? (
                            <>
                                <CheckCircle size={14} />
                                <span>Signature Verified</span>
                            </>
                        ) : status === 'invalid' ? (
                            <>
                                <XCircle size={14} />
                                <span>Invalid Signature</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={14} />
                                <span>Verification Pending / Key Missing</span>
                            </>
                        )}
                    </div>
                </div>
             )}
             
             {mode === 'encode' && signingError && (
                 <div className="px-4 py-2 border-t bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 font-medium">
                     <AlertTriangle size={14} />
                     <span>{signingError}</span>
                 </div>
             )}
          </div>

          {/* Mode Specific Analysis/Output */}
          {mode === 'decode' ? (
              <>
                <SecurityAnalysis warnings={warnings} status={status} />
                {(() => {
                    const pl = getPayloadObj();
                    return <Timeline iat={pl.iat} nbf={pl.nbf} exp={pl.exp} />;
                })()}
              </>
          ) : (
              <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Generated Token</label>
                    <button onClick={copyToken} className="text-xs flex items-center gap-1 text-primary hover:text-blue-600 transition-colors">
                        {copySuccess ? <Check size={14}/> : <Copy size={14}/>} {copySuccess ? 'Copied' : 'Copy Token'}
                    </button>
                 </div>
                 <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-secondary shadow-sm overflow-hidden group">
                     <textarea 
                         readOnly
                         value={token}
                         className="w-full h-32 p-4 font-mono text-sm leading-relaxed resize-none bg-transparent outline-none text-gray-600 dark:text-gray-300 break-all"
                     />
                 </div>
                 {/* Quick Timeline Preview for Encoding */}
                 {(() => {
                    const pl = getPayloadObj();
                    return <Timeline iat={pl.iat} nbf={pl.nbf} exp={pl.exp} />;
                 })()}
              </div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Bar: Privacy & Mode Switch */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
         
         {/* Mode Switch */}
         <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
             <button
               onClick={() => setMode('decode')}
               className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 mode === 'decode' 
                   ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                   : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
               }`}
             >
               <FileCode size={16} className="mr-2" /> Decode
             </button>
             <button
               onClick={() => setMode('encode')}
               className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 mode === 'encode' 
                   ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                   : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
               }`}
             >
               <FileKey size={16} className="mr-2" /> Encode
             </button>
         </div>

         {/* Privacy Badge */}
         <div className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
            <Shield size={14} />
            <span className="font-medium">Client-Side Only</span>
         </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        
        {/* LEFT COLUMN */}
        <div className={`flex-1 flex flex-col gap-4 min-h-0 ${mode === 'decode' ? 'xl:max-w-[40%]' : ''}`}>
           {mode === 'decode' ? (
               <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-secondary shadow-sm overflow-hidden relative group">
                  <div className="flex-none px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                     <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Encoded Token</h3>
                     <div className="flex gap-2">
                        <button onClick={copyToken} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors" title="Copy">
                            {copySuccess ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                        </button>
                        <button onClick={() => {setToken(''); onTokenChange('');}} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors" title="Clear">
                            <RefreshCw size={14} />
                        </button>
                     </div>
                  </div>
                  <div className="flex-1 relative">
                    <textarea 
                      className="w-full h-full p-6 font-mono text-sm leading-relaxed resize-none bg-transparent outline-none text-gray-600 dark:text-gray-300 break-all"
                      placeholder="Paste JWT here..."
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      spellCheck={false}
                    />
                    {!token && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <div className="text-center">
                           <FileJson className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                           <p className="text-sm">Paste a token to decode</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-none px-4 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400 flex items-center gap-1.5 justify-center">
                     <HelpCircle size={10} />
                     <span>Format: header.payload.signature</span>
                  </div>
               </div>
           ) : (
               /* ENCODE MODE: Left side is JSON Editors */
               renderJsonEditors()
           )}
           
           {/* Mobile-only section spacer */}
           <div className="xl:hidden h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
        </div>


        {/* RIGHT COLUMN */}
        <div className={`flex-1 flex flex-col gap-6 min-h-0 ${mode === 'encode' ? 'xl:max-w-[40%]' : ''}`}>
          {mode === 'decode' ? (
              <>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64 xl:h-auto shrink-0">
                    {/* Re-use editor render logic but for Decode mode split */}
                    <div className="flex flex-col h-full rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-dark-secondary shadow-sm overflow-hidden">
                        <div className="flex-none px-3 py-2 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
                          <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Header</span>
                        </div>
                        <div className="flex-1 relative">
                            <MonacoEditor 
                                value={headerJson}
                                onChange={(val) => setHeaderJson(val || '{}')}
                                language="json"
                                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col h-full rounded-xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-dark-secondary shadow-sm overflow-hidden">
                        <div className="flex-none px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Payload</span>
                        </div>
                        <div className="flex-1 relative">
                            <MonacoEditor 
                                value={payloadJson}
                                onChange={(val) => setPayloadJson(val || '{}')}
                                language="json"
                                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                            />
                        </div>
                    </div>
                 </div>
                 {renderConfigAndAnalysis()}
              </>
          ) : (
              /* ENCODE MODE: Right side is Config & Output */
              renderConfigAndAnalysis()
          )}
        </div>

      </div>
    </div>
  );
};

export default JwtDecoder;