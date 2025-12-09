import React from 'react';
import { ChatMessage } from '@/types/chat';
import { ArtifactDisplay } from './ArtifactDisplay';
import { PartsDisplay } from './PartsDisplay';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  // Извлекаем текст из artifacts для отображения в bubble
  const textFromArtifacts = message.artifacts
    ?.flatMap(
      artifact =>
        artifact.parts?.filter(part => part.kind === 'text').map(part => (part as any).text) || []
    )
    .filter(Boolean)
    .join('\n\n');

  // Нетекстовые части из artifacts (файлы, данные)
  const hasNonTextArtifacts = message.artifacts?.some(artifact =>
    artifact.parts?.some(part => part.kind !== 'text')
  );

  // Основной контент: либо content, либо текст из artifacts
  const mainContent = message.content || textFromArtifacts;

  // Показываем только statusText (без bubble) если нет другого контента
  const showOnlyStatus = message.statusText && !mainContent && !hasNonTextArtifacts;

  // Проверяем есть ли вообще parts для отображения
  const hasPartsToShow = message.parts && message.parts.length > 0;

  // Не показываем сообщение если нет ничего для отображения
  if (!mainContent && !message.statusText && !hasNonTextArtifacts && !hasPartsToShow) {
    return null;
  }

  return (
    <div
      className={`mb-4 ${
        message.sender === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
      }`}
    >
      {/* Sender name */}
      <div
        className={`text-xs text-muted-foreground mb-1 px-2 ${
          message.sender === 'user' ? 'text-right' : 'text-left'
        }`}
      >
        {message.senderName}
      </div>

      <div className="max-w-[70%] space-y-2">
        {/* Status indicator (inline) - показываем только если это единственный контент */}
        {showOnlyStatus && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            {message.statusText}
          </div>
        )}

        {/* Message bubble с основным контентом */}
        {mainContent && (
          <div
            className={`relative px-4 py-3 rounded-2xl text-sm break-words ${
              message.sender === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap'
                : 'bg-muted text-foreground rounded-bl-md'
            }`}
          >
            {message.sender === 'user' ? mainContent : <MarkdownRenderer content={mainContent} />}

            {/* Timestamp */}
            <div
              className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}
            >
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {/* Нетекстовые artifacts (файлы, данные) в Card обёртках */}
        {message.artifacts && message.artifacts.length > 0 && hasNonTextArtifacts && (
          <div className="space-y-2">
            {message.artifacts.map((artifact, index) => {
              // Показываем только нетекстовые части
              const nonTextParts = artifact.parts?.filter(part => part.kind !== 'text') || [];
              if (nonTextParts.length === 0) return null;

              return (
                <ArtifactDisplay
                  key={artifact.artifactId || index}
                  artifact={{ ...artifact, parts: nonTextParts }}
                />
              );
            })}
          </div>
        )}

        {/* Parts */}
        {hasPartsToShow && <PartsDisplay parts={message.parts!} />}
      </div>
    </div>
  );
};
