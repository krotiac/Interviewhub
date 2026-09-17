"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import Editor from '@monaco-editor/react';

let socket: Socket;

export default function InterviewRoom({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello InterviewHub!" << endl;\n    return 0;\n}');
  const [stdin, setStdin] = useState('');
  const [messages, setMessages] = useState<{sender: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [status, setStatus] = useState('Connecting...');
  
  // Execution state
  const [executionStatus, setExecutionStatus] = useState('Idle');
  const [output, setOutput] = useState('');

  useEffect(() => {
    // Connect to WebSocket
    socket = io('http://localhost:4000');
    
    socket.on('connect', () => {
      setStatus('Connected');
      socket.emit('join_interview', { interviewId: params.id, userId: 'test-user' });
    });

    socket.on('code_updated', (data: { code: string, language: string }) => {
      if (data.code !== undefined) setCode(data.code);
      if (data.language !== undefined) setLanguage(data.language);
    });

    socket.on('new_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });
    
    // Execution Events
    socket.on('execution_queued', () => {
      setExecutionStatus('Queued...');
      setOutput('');
    });
    
    socket.on('execution_completed', (data: any) => {
      setExecutionStatus(`Completed: ${data.result.status} (${data.result.executionTime}ms)`);
      setOutput(data.result.output);
    });
    
    socket.on('execution_error', (data: any) => {
      setExecutionStatus('Error');
      setOutput(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [params.id]);

  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    setCode(val);
    socket.emit('code_update', { interviewId: params.id, code: val, language });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    socket.emit('code_update', { interviewId: params.id, code, language: newLang });
  };

  const sendMessage = () => {
    if (!chatInput) return;
    socket.emit('send_message', { interviewId: params.id, senderId: 'test-user', content: chatInput });
    setChatInput('');
  };

  const runCode = () => {
    socket.emit('run_code', { 
      interviewId: params.id, 
      userId: 'test-user', 
      code, 
      language,
      stdin 
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left panel: Editor */}
      <div className="w-2/3 flex flex-col border-r border-gray-700">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
          <h1 className="text-xl font-bold">InterviewHub: {params.id}</h1>
          <div className="flex items-center gap-4">
            <select 
              value={language} 
              onChange={handleLanguageChange}
              className="bg-gray-700 text-white px-2 py-1 rounded"
            >
              <option value="cpp">C++</option>
              <option value="javascript">JavaScript</option>
            </select>
            <span className="text-sm bg-gray-700 px-3 py-1 rounded">{status}</span>
          </div>
        </div>
        
        <div className="flex-1">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={handleEditorChange}
            options={{ minimap: { enabled: false } }}
          />
        </div>
      </div>

      {/* Right panel: Output & Chat */}
      <div className="w-1/3 flex flex-col">
        {/* Execution Output */}
        <div className="h-1/2 flex flex-col border-b border-gray-700">
          <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
            <h2 className="font-bold">Execution & Output</h2>
            <button onClick={runCode} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1 rounded font-bold text-sm">
              Run Code
            </button>
          </div>
          
          <div className="p-2 bg-gray-800 flex flex-col">
            <label className="text-xs text-gray-400 mb-1">Standard Input (stdin)</label>
            <textarea 
              className="bg-gray-700 text-sm p-2 h-16 resize-none rounded outline-none"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Input parameters here..."
            />
          </div>
          
          <div className="flex-1 p-3 bg-black overflow-y-auto font-mono text-sm">
            <div className={`mb-2 font-bold ${executionStatus.includes('PASSED') ? 'text-green-400' : executionStatus.includes('Error') ? 'text-red-400' : 'text-yellow-400'}`}>
              Status: {executionStatus}
            </div>
            <pre className="text-gray-300 whitespace-pre-wrap">{output}</pre>
          </div>
        </div>

        {/* Chat */}
        <div className="h-1/2 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto bg-gray-900">
            <h2 className="text-lg font-bold mb-4">Chat</h2>
            <div className="space-y-2">
              {messages.map((m, i) => (
                <div key={i} className="bg-gray-800 p-2 rounded text-sm">
                  <span className="font-bold text-blue-400">{m.sender}: </span>
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm outline-none"
                placeholder="Type message..."
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} className="bg-blue-600 px-4 py-2 rounded text-white text-sm font-bold">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
