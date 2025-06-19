import React, { useRef, useEffect, useState } from "react";
import { Mic, Send, Loader2, History } from "lucide-react";
import { Button } from "./button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import botLogo from '../../assets/velociti-logo.png';

export type ChatMessage = {
  id: string;
  sender: "user" | "bot";
  content: string;
};

type ChatProps = {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onMic: () => void;
  isRecording: boolean;
  isDirectLineLoading?: boolean;
  onToggleHistory?: () => void;
};

const Chat: React.FC<ChatProps> = ({ 
  messages, 
  onSend, 
  onMic, 
  isRecording, 
  isDirectLineLoading = false,
  onToggleHistory 
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto">
        {messages.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center h-full">
            <div className="flex flex-col items-center w-full max-w-2xl px-4">
              <img src={botLogo} alt="VelocitiAssist AI" className="w-24 h-24 mb-4" />
              <h2 className="text-4xl font-bold mb-4 text-center">VelocitiAssist AI</h2>
              <p className="text-gray-600 text-center mb-8 text-lg">
                I'm here to help you with your questions. You can type your message or use the voice button to speak with me.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                <div className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <span className="text-2xl mb-2">⌨️</span>
                  <h3 className="font-semibold mb-1">Type to chat</h3>
                  <p className="text-sm text-gray-500 text-center">Send a message to start a conversation</p>
                </div>
                <div className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <Mic className="h-8 w-8 mb-2 text-gray-600" />
                  <h3 className="font-semibold mb-1">Voice enabled</h3>
                  <p className="text-sm text-gray-500 text-center">Click the mic button to speak</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`w-full max-w-3xl px-4 py-6 ${msg.sender === "user" ? "flex justify-end" : ""}`}>
                  <div className={`flex items-start gap-4 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.sender === "user" ? (
                      <div className="flex-1 text-right">
                        <div className="inline-block bg-gray-200/80 text-gray-800 rounded-2xl pl-4 pr-6 py-2 max-w-[90%]">
                          <div className="prose prose-sm max-w-none dark:prose-invert text-left font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
                          <img src={botLogo} alt="VelocitiAssist AI" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <div className="prose prose-sm max-w-none dark:prose-invert font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="w-full border-t border-gray-200 bg-white">
        <div className="w-full max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleHistory}
              className="text-gray-500 hover:text-gray-700"
            >
              <History className="h-5 w-5" />
            </Button>
            <input
              className="flex-1 border-none outline-none bg-transparent px-2 py-2 text-base"
              type="text"
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isRecording || isDirectLineLoading}
            />
            <Button
              onClick={onMic}
              className={`rounded-full p-2 ${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-gray-100 hover:bg-gray-200"}`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              <Mic className={`h-5 w-5 ${isRecording ? "text-white" : "text-gray-600"}`} />
            </Button>
            <Button
              onClick={handleSend}
              className="bg-[#F94239] hover:bg-[#E03A32] text-white rounded-full p-2"
              aria-label="Send message"
              disabled={!input.trim() || isRecording || isDirectLineLoading}
            >
              {isDirectLineLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat; 