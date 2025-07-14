"use client";


interface Props {
  messages: { prompt: string; response: string }[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isSending?: boolean;
}


export default function ChatMessages({ messages, messagesEndRef }: Props) {
  return (
    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
      {messages.map((msg, idx) => (
        <div key={idx}>
          <p className="font-bold">You: {msg.prompt}</p>
          <p className="text-gray-700">AI: {msg.response}</p>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
