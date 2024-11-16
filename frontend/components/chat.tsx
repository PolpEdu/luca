'use client';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

interface ChatProps {
  id?: string;
  initialMessages?: Message[];
  isNewChat?: boolean;
}

export function Chat({ id, initialMessages = [], isNewChat = false }: ChatProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {initialMessages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'
              }`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
                }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      {/* Add message input here if needed */}
    </div>
  );
}