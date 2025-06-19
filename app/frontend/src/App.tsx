import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import GroundingFileView from "@/components/ui/grounding-file-view";
import Chat, { ChatMessage } from "@/components/ui/chat";
import HistoryPanel from "@/components/ui/history-panel";

import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";
import { useDirectLine } from "@/hooks/useDirectLine";

import { GroundingFile, ToolResult, ResponseInputAudioTranscriptionCompleted, ExtensionMiddleTierToolResponse } from "./types";

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [groundingFiles, setGroundingFiles] = useState<GroundingFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<GroundingFile | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // Direct Line for text chat
    const {
        isConnected: isDirectLineConnected,
        isLoading: isDirectLineLoading,
        error: directLineError,
        sendMessage: sendDirectLineMessage,
        messages: directLineMessages
    } = useDirectLine((typing) => {
        if (typing) {
            setMessages(prev => [
                ...prev,
                {
                    id: 'bot-thinking',
                    sender: 'bot',
                    content: 'Bot is thinking...'
                }
            ]);
        } else {
            setMessages(prev => prev.filter(msg => msg.id !== 'bot-thinking'));
        }
    });

    // Handle Direct Line connection status
    useEffect(() => {
        if (directLineError) {
            setConnectionError(`Direct Line Error: ${directLineError}`);
        } else if (!isDirectLineConnected && !isDirectLineLoading) {
            setConnectionError('Not connected to Direct Line');
        } else {
            setConnectionError(null);
        }
    }, [isDirectLineConnected, isDirectLineLoading, directLineError]);

    // Voice system (unchanged)
    const { startSession, addUserAudio, inputAudioBufferClear, sendTextMessage } = useRealTime({
        onWebSocketOpen: () => console.log("WebSocket connection opened"),
        onWebSocketClose: () => console.log("WebSocket connection closed"),
        onWebSocketError: event => console.error("WebSocket error:", event),
        onReceivedError: message => console.error("error", message),
        onReceivedResponseAudioDelta: message => {
            isRecording && playAudio(message.delta);
        },
        onReceivedInputAudioBufferSpeechStarted: () => {
            stopAudioPlayer();
            setMessages(prev => [
                ...prev,
                {
                    id: 'transcribing',
                    sender: 'user',
                    content: 'Transcribing...'
                }
            ]);
        },
        onReceivedInputAudioTranscriptionCompleted: (message: ResponseInputAudioTranscriptionCompleted) => {
            setMessages(prev => prev.map(msg =>
                msg.id === 'transcribing'
                    ? { ...msg, content: message.transcript }
                    : msg
            ));
            setMessages(prev => [
                ...prev,
                {
                    id: 'bot-thinking',
                    sender: 'bot',
                    content: 'Bot is thinking...'
                }
            ]);
        },
        onReceivedExtensionMiddleTierToolResponse: (message: ExtensionMiddleTierToolResponse) => {
            setMessages(prev => prev.filter(msg => msg.id !== 'bot-thinking'));
            const result: ToolResult = JSON.parse(message.tool_result);
            const files: GroundingFile[] = result.sources.map(x => {
                return { id: x.chunk_id, name: x.title, content: x.chunk };
            });
            setGroundingFiles(prev => [...prev, ...files]);
            if (result.sources && result.sources.length > 0) {
                setMessages(prev => [
                    ...prev,
                    {
                        id: `${Date.now()}-bot`,
                        sender: "bot",
                        content: result.sources.map(s => s.chunk).join("\n\n"),
                    },
                ]);
            }
        },
    });

    const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
    const { start: startAudioRecording, stop: stopAudioRecording } = useAudioRecorder({ onAudioRecorded: addUserAudio });

    const onToggleListening = async () => {
        if (!isRecording) {
            startSession();
            await startAudioRecording();
            resetAudioPlayer();

            setIsRecording(true);
        } else {
            await stopAudioRecording();
            stopAudioPlayer();
            inputAudioBufferClear();

            setIsRecording(false);
        }
    };

    const { t } = useTranslation();

    const handleSend = async (content: string) => {
        if (isRecording) {
            // If recording, use voice system
            const userMsg: ChatMessage = {
                id: `${Date.now()}-user`,
                sender: "user",
                content,
            };
            setMessages((prev) => [...prev, userMsg]);
            setMessages(prev => [
                ...prev,
                {
                    id: 'bot-thinking',
                    sender: 'bot',
                    content: 'Bot is thinking...'
                }
            ]);
            sendTextMessage(content);
        } else {
            // If not recording, use Direct Line
            if (!isDirectLineConnected) {
                setConnectionError('Not connected to Direct Line. Please try again.');
                return;
            }
            try {
                await sendDirectLineMessage(content);
            } catch (error) {
                console.error('Error sending message:', error);
                setMessages(prev => prev.filter(msg => msg.id !== 'bot-thinking'));
                setConnectionError('Failed to send message. Please try again.');
            }
        }
    };

    const handleMic = async () => {
        await onToggleListening();
    };

    // Update messages when Direct Line messages change
    useEffect(() => {
        if (!isRecording) {
            setMessages(directLineMessages.map(msg => ({
                id: msg.id,
                sender: msg.sender === 'user' ? 'user' : 'bot',
                content: msg.text
            })));
        }
    }, [directLineMessages, isRecording]);

    return (
        <div className="flex min-h-screen h-screen flex-col bg-white text-gray-900">
            <main className="flex flex-grow flex-col h-full">
                <h1 className="sr-only">{t("app.title")}</h1>
                {connectionError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{connectionError}</span>
                    </div>
                )}
                <Chat
                    messages={messages}
                    onSend={handleSend}
                    onMic={handleMic}
                    isRecording={isRecording}
                    isDirectLineLoading={isDirectLineLoading}
                    onToggleHistory={() => setShowHistory(prev => !prev)}
                />
            </main>
            <HistoryPanel
                show={showHistory}
                history={[]}
                onClosed={() => setShowHistory(false)}
                onSelectedGroundingFile={setSelectedFile}
                groundingFiles={groundingFiles}
            />
            <GroundingFileView groundingFile={selectedFile} onClosed={() => setSelectedFile(null)} />
        </div>
    );
}

export default App;
