import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Wifi, 
  WifiOff, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Terminal, 
  RefreshCw, 
  Settings, 
  Link as LinkIcon, 
  FileText, 
  Lock,
  Copy,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface HealthResponse {
  success: boolean;
  status: string;
  message: string;
  timestamp: string;
  database?: {
    provider: string;
    state: string;
    connectionStateCode: number;
  };
}

interface TestResult {
  endpoint: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  statusCode?: number;
  latency?: number;
  error?: string;
  corsSuspected?: boolean;
  data?: HealthResponse | any;
  headers?: Record<string, string>;
}

export const Diagnostics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [customUrl, setCustomUrl] = useState<string>('/api/health');
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST' | 'OPTIONS'>('GET');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedResultTab, setSelectedResultTab] = useState<string>('relative');
  const [activeInstructionTab, setActiveInstructionTab] = useState<'cors' | 'vite' | 'env'>('cors');

  // Helper inside component to format timing
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev]);
  };

  const clearLogs = () => setLogs([]);

  const runDiagnostics = async () => {
    setLoading(true);
    clearLogs();
    addLog('Starting Novel Threads platform diagnostic suite...');

    const targets = [
      { key: 'relative', url: '/api/health', desc: 'Relative Proxy Path (/api/health)' },
      { key: 'homeHealth', url: '/health', desc: 'Direct Root Path (/health)' },
      { key: 'origin', url: `${window.location.origin}/api/health`, desc: 'Full Absolute Origin URL' }
    ];

    const updatedResults: Record<string, TestResult> = {};

    for (const target of targets) {
      addLog(`Initiating fetch target: ${target.desc} (${target.url})`);
      updatedResults[target.key] = {
        endpoint: target.url,
        status: 'PENDING'
      };
      setResults({ ...updatedResults });

      const startTime = performance.now();
      try {
        const response = await fetch(target.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        // Try reading headers
        const resHeaders: Record<string, string> = {};
        response.headers.forEach((val, key) => {
          resHeaders[key] = val;
        });

        const isJson = response.headers.get('content-type')?.includes('application/json');
        let body: any = null;
        if (isJson) {
          body = await response.json();
        } else {
          body = { text: await response.text() };
        }

        addLog(`Response acquired from ${target.url}. Status: ${response.status}. Latency: ${latency}ms`);

        updatedResults[target.key] = {
          endpoint: target.url,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          statusCode: response.status,
          latency,
          data: body,
          headers: resHeaders
        };
      } catch (err: any) {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        const errMessage = err?.message || String(err);
        
        addLog(`🔴 FAILED fetch target to ${target.url}: ${errMessage}`);
        
        // Assess if it's likely a CORS issue or network-down error
        const isCorsSuspected = errMessage.toLowerCase().includes('failed to fetch') || 
                                 errMessage.toLowerCase().includes('networkerror');

        updatedResults[target.key] = {
          endpoint: target.url,
          status: 'FAILED',
          latency,
          error: errMessage,
          corsSuspected: isCorsSuspected
        };
      }
      setResults({ ...updatedResults });
    }

    addLog('Diagnostics suite completed. Analyze the details below.');
    setLoading(false);
  };

  const runCustomTest = async () => {
    if (!customUrl.trim()) return;

    addLog(`Running custom request: [${customMethod}] ${customUrl}`);
    const key = 'custom';
    const startTime = performance.now();

    setResults(prev => ({
      ...prev,
      [key]: { endpoint: customUrl, status: 'PENDING' }
    }));
    setSelectedResultTab('custom');

    try {
      const response = await fetch(customUrl, {
        method: customMethod,
        headers: {
          'Accept': 'application/json'
        }
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      const resHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      let body: any = null;
      try {
        body = await response.json();
      } catch {
        body = { text: await response.text() };
      }

      addLog(`Custom test finished. Code: ${response.status}, time: ${latency}ms`);
      setResults(prev => ({
        ...prev,
        [key]: {
          endpoint: customUrl,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          statusCode: response.status,
          latency,
          data: body,
          headers: resHeaders
        }
      }));
    } catch (err: any) {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      const errMessage = err?.message || String(err);

      addLog(`🔴 Custom request threw: ${errMessage}`);
      setResults(prev => ({
        ...prev,
        [key]: {
          endpoint: customUrl,
          status: 'FAILED',
          latency,
          error: errMessage,
          corsSuspected: errMessage.toLowerCase().includes('failed to fetch')
        }
      }));
    }
  };

  // Run on first load automatically
  useEffect(() => {
    runDiagnostics();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Compute stats for overview circles
  const relativeResult = results['relative'];
  const devAppUrl = window.location.href;

  return (
    <div className="bg-neutral-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Banner header info */}
        <div className="bg-neutral-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-neutral-800 mb-8">
          <div className="absolute inset-0 opacity-10 select-none pointer-events-none">
            <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/30 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/20 mb-3">
                <Activity className="w-3.5 h-3.5 animate-pulse" /> SYSTEM MONITOR
              </span>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
                API Diagnostics & Connectivity Suite
              </h1>
              <p className="mt-2 text-sm text-neutral-400 max-w-2xl">
                Inspect CORS boundaries, route configurations, connection latency, database endpoints, and troubleshoot connectivity errors directly in real-time.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md cursor-pointer transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Re-Run Tests</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Metric cards for simple telemetry check */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">Overall Connectivity State</p>
              <h3 className="text-xl font-bold text-neutral-800 mt-1 flex items-center gap-2">
                {relativeResult ? (
                  relativeResult.status === 'SUCCESS' ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Wifi className="w-5 h-5" /> Online
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1">
                      <WifiOff className="w-5 h-5" /> Connection Failed
                    </span>
                  )
                ) : (
                  <span className="text-neutral-400">Loading...</span>
                )}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${relativeResult && relativeResult.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
              <Server className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">Estimated Latency (RTT)</p>
              <h3 className="text-xl font-bold text-neutral-800 mt-1">
                {relativeResult && relativeResult.latency !== undefined ? (
                  <span className="font-mono text-orange-600">{relativeResult.latency} ms</span>
                ) : (
                  <span className="text-neutral-400">-- ms</span>
                )}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">Database Link Status</p>
              <h3 className="text-xl font-bold text-neutral-800 mt-1">
                {relativeResult && relativeResult.data?.database ? (
                  <span className={`capitalize inline-flex items-center gap-1.5 font-bold ${relativeResult.data.database.state === 'connected' ? 'text-emerald-600' : 'text-amber-500'}`}>
                    <Database className="w-4 h-4" /> {relativeResult.data.database.state}
                  </span>
                ) : (
                  <span className="text-neutral-400 font-medium">Inactive</span>
                )}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-neutral-100 text-neutral-600">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel cols (Diagnostics Output logs) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Connection target inspector */}
            <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
              <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 flex items-center justify-between">
                <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                  <Server className="w-4 h-4 text-orange-500" /> Endpoint Connection Verifications
                </h3>
                <span className="text-xs text-neutral-500 font-mono">Targets: 3</span>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border border-neutral-200/60 rounded-xl p-1 bg-neutral-50 mb-6">
                  <button
                    onClick={() => setSelectedResultTab('relative')}
                    className={`px-4 py-2 text-xs font-mono font-medium rounded-lg text-center cursor-pointer transition-all ${selectedResultTab === 'relative' ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    /api/health
                  </button>
                  <button
                    onClick={() => setSelectedResultTab('homeHealth')}
                    className={`px-4 py-2 text-xs font-mono font-medium rounded-lg text-center cursor-pointer transition-all ${selectedResultTab === 'homeHealth' ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    /health
                  </button>
                  <button
                    onClick={() => setSelectedResultTab('custom')}
                    className={`px-4 py-2 text-xs font-mono font-medium rounded-lg text-center cursor-pointer transition-all ${selectedResultTab === 'custom' ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    Custom Test {results['custom'] && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>}
                  </button>
                </div>

                {/* Selected tab feedback pane */}
                {(() => {
                  const activeResult = results[selectedResultTab];
                  if (!activeResult) {
                    return (
                      <div className="py-12 text-center text-neutral-400 font-sans text-xs">
                        No telemetry results recorded for this test channel. Click "Re-Run Tests" to establish connections.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Sub card of status */}
                      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${activeResult.status === 'SUCCESS' ? 'bg-emerald-50/40 border-emerald-200/60' : 'bg-rose-50/40 border-rose-200/60'}`}>
                        <div className="flex items-start gap-3">
                          {activeResult.status === 'SUCCESS' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-xs font-mono text-neutral-600 block break-all font-semibold select-all">
                              {activeResult.endpoint}
                            </p>
                            <span className="text-[11px] font-mono mt-1 inline-block text-neutral-400">
                              Latency: {activeResult.latency !== undefined ? `${activeResult.latency}ms` : 'unknown'} 
                              {activeResult.statusCode && ` • HTTP ${activeResult.statusCode}`}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className={`inline-block px-2.5 py-1 text-xs font-mono font-bold rounded-lg ${activeResult.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                            {activeResult.status}
                          </span>
                        </div>
                      </div>

                      {/* CORS analysis prompt box */}
                      {activeResult.corsSuspected && (
                        <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-3 text-amber-800 text-xs shadow-inner">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="font-bold">Possible CORS Boundary Block or Host Failure Suspected!</h4>
                            <p className="text-amber-700 leading-relaxed font-sans">
                              The browser threw a "Failed to fetch" (TypeError). This behaves identically to when a browser blocks a request because the server doesn't respond with correct <code className="bg-amber-100 rounded px-1 py-0.2">Access-Control-Allow-Origin</code> matching headers, OR if the backup server port or host doesn't exist.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Headers details list */}
                      {activeResult.headers && Object.keys(activeResult.headers).length > 0 && (
                        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
                          <h4 className="text-xs font-mono font-bold text-neutral-700 mb-2">Response Headers Received</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                            {Object.entries(activeResult.headers).map(([key, val]) => (
                              <div key={key} className="bg-white border border-neutral-200 p-2 rounded-lg font-mono text-[11px]">
                                <span className="text-neutral-400 block font-medium">{key}</span>
                                <span className="text-neutral-800 font-semibold truncate block" title={val}>{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Received Payload Data */}
                      {activeResult.data && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-neutral-700 font-mono">Response Payload Body</h4>
                          <pre className="bg-neutral-900 text-neutral-200 text-xs rounded-xl p-4 overflow-x-auto font-mono max-h-72 shadow-lg leading-relaxed border border-neutral-800">
                            {JSON.stringify(activeResult.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Display error message */}
                      {activeResult.error && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-neutral-700 font-mono">Detailed Connection Error</h4>
                          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-rose-400 font-mono text-xs max-h-60 overflow-y-auto select-all">
                            {activeResult.error}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Custom test panel */}
            <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-orange-500" /> Interactive Custom Test Console
                </h3>
              </div>
              <div className="p-5">
                <p className="text-xs text-neutral-500 mb-4">
                  Input a custom endpoint path or an absolute third-party API URL to test directly from the browser window run-context. Great for checking remote servers.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="w-full sm:w-1/4">
                    <select
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={customMethod}
                      onChange={(e: any) => setCustomMethod(e.target.value)}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="OPTIONS">OPTIONS</option>
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g. /api/auth/me or http://localhost:3000/health"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <button
                      onClick={runCustomTest}
                      className="w-full sm:w-auto px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:translate-y-0.5 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Execute Request
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live activity log stream */}
            <div className="bg-neutral-900 text-neutral-200 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden font-mono">
              <div className="bg-neutral-950 px-5 py-3.5 border-b border-neutral-800/80 flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-neutral-300">
                  <Terminal className="w-4 h-4 text-orange-500 animate-pulse" /> Diagnostic Stream Logs
                </span>
                <button 
                  onClick={clearLogs}
                  className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-300 pointer-events-auto cursor-pointer"
                >
                  Clear Terminal
                </button>
              </div>
              <div className="p-4 text-xs h-60 overflow-y-auto space-y-1.5 flex flex-col-reverse scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {logs.length > 0 ? (
                  logs.map((log, idx) => (
                    <div key={idx} className="transition-all leading-relaxed hover:bg-neutral-800/40 py-0.5 px-1 rounded">
                      {log.startsWith('[') && log.includes('🔴') ? (
                        <span className="text-rose-400 select-all">{log}</span>
                      ) : log.includes('SUCCESS') || log.includes('Response acquired') ? (
                        <span className="text-emerald-400 select-all">{log}</span>
                      ) : (
                        <span className="text-neutral-300 select-all">{log}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 text-center py-6">Logs will stream here during diagnostic executions.</div>
                )}
              </div>
            </div>

          </div>

          {/* Right panel cols (Troubleshooting Guidebook) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Diagnosis analysis wizard */}
            <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl overflow-hidden p-5">
              <h3 className="font-bold text-neutral-800 text-sm mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-neutral-600" /> Automated Diagnosis
              </h3>
              
              <div className="space-y-4 text-xs text-neutral-600 font-sans leading-relaxed">
                {relativeResult ? (
                  relativeResult.status === 'SUCCESS' ? (
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> All Systems Nominal
                      </div>
                      <p>
                        The frontend successfully routed connections to the backend at <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">/api/health</code>. The Vite server proxy is configuration-complete, CORS policies are welcoming, and authentication tokens should flow seamlessly.
                      </p>
                    </div>
                  ) : relativeResult.corsSuspected ? (
                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" /> CORS Policy Header Conflict
                      </div>
                      <p>
                        The current browser is blocking the request. Since your environment resides on Cloud Run URLs or distinct localhost ports, your API must explicitly include these origins!
                      </p>
                      <button
                        onClick={() => {
                          setSelectedResultTab('relative');
                          setActiveInstructionTab('cors');
                        }}
                        className="text-xs font-bold text-rose-600 flex items-center gap-0.5 hover:underline bg-transparent"
                      >
                        View CORS Remedy Checklist <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Server Port Unreachable
                      </div>
                      <p>
                        Either the backend development server is currently building/restarting, or the proxy route is configured incorrectly. Check whether the target port inside <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">vite.config.ts</code> matches the Express boot-port!
                      </p>
                      <button
                        onClick={() => {
                          setSelectedResultTab('relative');
                          setActiveInstructionTab('vite');
                        }}
                        className="text-xs font-bold text-amber-700 flex items-center gap-0.5 hover:underline bg-transparent"
                      >
                        Check Vite Config Guides <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-neutral-400">Awaiting diagnostic test telemetry stream...</p>
                )}
              </div>
            </div>

            {/* Step-by-Step guidebook */}
            <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
              <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-4">
                <h3 className="font-bold text-neutral-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" /> Troubleshooting Guidebook
                </h3>
              </div>
              
              <div className="p-5">
                <div className="flex gap-2 border-b border-neutral-200 pb-3 mb-4">
                  <button
                    onClick={() => setActiveInstructionTab('cors')}
                    className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeInstructionTab === 'cors' ? 'bg-orange-500/10 text-orange-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    1. CORS Issues
                  </button>
                  <button
                    onClick={() => setActiveInstructionTab('vite')}
                    className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeInstructionTab === 'vite' ? 'bg-orange-500/10 text-orange-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    2. Vite Proxy
                  </button>
                  <button
                    onClick={() => setActiveInstructionTab('env')}
                    className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeInstructionTab === 'env' ? 'bg-orange-500/10 text-orange-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    3. VITE_API_URL
                  </button>
                </div>

                {/* Switch contents */}
                {activeInstructionTab === 'cors' && (
                  <div className="space-y-4 text-xs leading-relaxed text-neutral-600">
                    <p>
                      <strong>Why 'Refused to connect' happens with CORS:</strong>
                    </p>
                    <p>
                      If you're testing on localhost (e.g., port 5173 or port 3000), or accessing deployed Cloud Run dynamic host URLs, the backend API must be informed to permit cookies and headers from that source.
                    </p>
                    <div className="bg-neutral-900 text-neutral-100 rounded-xl p-3.5 font-mono text-[10px] space-y-1 relative group">
                      <div className="flex justify-between items-center text-neutral-500 pb-1 border-b border-neutral-850">
                        <span className="text-[9px] uppercase">Express CORS Middleware</span>
                        <button 
                          onClick={() => copyToClipboard(`app.use(cors({\n  origin: (origin, callback) => {\n    // dynamic validator\n    callback(null, true);\n  },\n  credentials: true\n}));`)}
                          className="hover:text-white cursor-pointer active:scale-95"
                          title="Copy block"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <pre className="overflow-x-auto pt-1 text-neutral-300">
{`app.use(cors({
  origin: (origin, callback) => {
    // Allows localhost & cloud run
    callback(null, true);
  },
  credentials: true
}));`}
                      </pre>
                    </div>
                    <p className="text-[11px] text-neutral-500 flex items-start gap-1">
                      <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" /> We have pre-configured a permissive fallback handler inside your core <code className="font-mono">server.ts</code> so localhost and Cloud Run domains bypass restriction.
                    </p>
                  </div>
                )}

                {activeInstructionTab === 'vite' && (
                  <div className="space-y-4 text-xs leading-relaxed text-neutral-600">
                    <p>
                      <strong>Configuring the Vite proxy rules:</strong>
                    </p>
                    <p>
                      In typical Single Page Applications (SPAs), we write relative URLs in our frontend (e.g. <code className="font-mono bg-neutral-100 rounded px-1">fetch('/api/novels')</code>). Under development, Vite redirects these relative requests to your local middleware backend, preventing CORS issues!
                    </p>
                    <div className="bg-neutral-900 text-neutral-100 rounded-xl p-3.5 font-mono text-[10px] space-y-1 relative group">
                      <div className="flex justify-between items-center text-neutral-500 pb-1 border-b border-neutral-850">
                        <span className="text-[9px] uppercase">vite.config.ts proxy block</span>
                        <button 
                          onClick={() => copyToClipboard(`proxy: {\n  '/api': {\n    target: process.env.VITE_API_URL || 'http://localhost:3000',\n    changeOrigin: true,\n    secure: false\n  }\n}`)}
                          className="hover:text-white cursor-pointer active:scale-95"
                          title="Copy block"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <pre className="overflow-x-auto pt-1 text-neutral-300 font-sans leading-relaxed text-[11px]">
{`proxy: {
  '/api': {
    target: process.env.VITE_API_URL || 'http://localhost:3000',
    changeOrigin: true,
    secure: false
  }
}`}
                      </pre>
                    </div>
                    <p>
                      Your environment has a customized <code className="font-mono">vite.config.ts</code> already incorporating process-proxy variables, guaranteeing robust handshakes with backing processes.
                    </p>
                  </div>
                )}

                {activeInstructionTab === 'env' && (
                  <div className="space-y-4 text-xs leading-relaxed text-neutral-600">
                    <p>
                      <strong>How to acquire/set VITE_API_URL:</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-neutral-600 font-sans">
                      <li>
                        <strong>When running in combined Node.js + Client:</strong> 
                        <p className="pl-4 mt-1 text-neutral-500">
                          If you are serving the frontend static build from your Express container directly in production, you <strong>do not need</strong> to set <code className="font-mono">VITE_API_URL</code> at all! Requests default back to host root relative path transparently.
                        </p>
                      </li>
                      <li>
                        <strong>When debugging via separate ports:</strong>
                        <p className="pl-4 mt-1 text-neutral-500">
                          Set <code className="font-mono font-bold text-neutral-800">VITE_API_URL=http://localhost:3000</code> in your environment variables. This updates the Vite proxy to locate your server running locally on port 3000.
                        </p>
                      </li>
                      <li>
                        <strong>Adding environment secrets:</strong>
                        <p className="pl-4 mt-1 text-neutral-500">
                          Navigate to the system <strong>Settings menu</strong> inside the AI Studio code workspace panel, add any required dynamic URL endpoints, then verify runtime handshake loops.
                        </p>
                      </li>
                    </ol>
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
