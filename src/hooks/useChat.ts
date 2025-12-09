import { useState, useRef, useCallback, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import { A2AClient } from '@/a2a/client';
import {
  TaskSendParams,
  Message,
  Part,
  Artifact,
  MessageSendParams,
  MessageSendConfiguration,
} from '@/a2a/schema';
import { v4 as uuidv4 } from 'uuid';
import { AgentCard, Task, TaskQueryParams, TextPart } from '@/a2a/schema';

interface UseChatProps {
  agentUrl?: string;
  isStreamingEnabled?: boolean;
  contextId?: string;
}

export const useChat = ({ agentUrl, isStreamingEnabled = false, contextId }: UseChatProps = {}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'agent',
      content: 'Спросите что-нибудь у агента',
      senderName: 'Assistant',
      timestamp: new Date(),
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs для управления анимацией печатания
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStateRef = useRef<{
    messageId: number | null;
    fullText: string;
    currentIndex: number;
    isTyping: boolean;
  }>({
    messageId: null,
    fullText: '',
    currentIndex: 0,
    isTyping: false,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Функция для симуляции печатания токенов
  const simulateTyping = useCallback((messageId: number, fullText: string, speed: number = 30) => {
    // Очищаем предыдущую анимацию
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingStateRef.current = {
      messageId,
      fullText,
      currentIndex: 0,
      isTyping: true,
    };

    const typeNextChar = () => {
      const state = typingStateRef.current;

      if (state.currentIndex < state.fullText.length && state.isTyping) {
        // Определяем следующий токен (слово или символ)
        let nextIndex = state.currentIndex + 1;

        // Ускоряем печатание для пробелов и знаков препинания
        const currentChar = state.fullText[state.currentIndex];
        if (currentChar === ' ' || /[.,!?;:]/.test(currentChar)) {
          speed = 10;
        } else if (/[a-zA-Zа-яА-ЯёЁ0-9]/.test(currentChar)) {
          // Для обычных символов пытаемся найти конец слова
          while (
            nextIndex < state.fullText.length &&
            /[a-zA-Zа-яА-ЯёЁ0-9]/.test(state.fullText[nextIndex])
          ) {
            nextIndex++;
          }
          speed = Math.random() * 40 + 20; // 20-60ms для слов
        } else {
          speed = 50; // Медленнее для специальных символов
        }

        const displayText = state.fullText.substring(0, nextIndex);

        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: displayText + '▋' } // Добавляем курсор
              : msg
          )
        );

        typingStateRef.current.currentIndex = nextIndex;

        typingTimeoutRef.current = setTimeout(typeNextChar, speed);
      } else {
        // Завершаем печатание
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: state.fullText } // Убираем курсор
              : msg
          )
        );

        typingStateRef.current.isTyping = false;
      }
    };

    typeNextChar();
  }, []);

  // Функция для остановки анимации печатания
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const state = typingStateRef.current;
    if (state.isTyping && state.messageId) {
      setMessages(prev =>
        prev.map(msg => (msg.id === state.messageId ? { ...msg, content: state.fullText } : msg))
      );
      typingStateRef.current.isTyping = false;
    }
  }, []);

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Функция для преобразования ChatMessage в A2A Message формат
  const convertChatMessageToA2AMessage = useCallback(
    (chatMessage: ChatMessage): Message => {
      const parts: Part[] = [
        {
          kind: 'text',
          text: chatMessage.content,
          metadata: undefined,
        },
      ];

      return {
        messageId: `chat-${chatMessage.id}-${Date.now()}`,
        role: chatMessage.sender === 'user' ? 'user' : 'agent',
        parts: parts,
        kind: 'message',
        ...(contextId && { contextId: contextId }), // Условно добавляем contextId
        metadata: {
          timestamp: chatMessage.timestamp.toISOString(),
          senderName: chatMessage.senderName,
          originalId: chatMessage.id,
        },
      };
    },
    [contextId]
  );

  // Функция для получения истории последних 10 сообщений в формате A2A
  const getMessageHistory = useCallback(
    (currentMessages: ChatMessage[]): Message[] => {
      // Берем последние 10 сообщений (исключая приветственное сообщение если это единственное)
      const messagesToInclude =
        currentMessages.length === 1 && currentMessages[0].id === 1
          ? [] // Не включаем начальное приветственное сообщение
          : currentMessages.slice(-10); // Берем последние 10 сообщений

      return messagesToInclude.map(convertChatMessageToA2AMessage);
    },
    [convertChatMessageToA2AMessage]
  );

  // Обычная отправка сообщения (новая схема)
  const sendMessageSync = useCallback(
    async (content: string) => {
      const client = new A2AClient(agentUrl!, window.fetch.bind(window));
      const messageId = uuidv4();

      // Получаем историю сообщений
      const messageHistory = getMessageHistory(messages);

      // Создаем конфигурацию
      const configuration: MessageSendConfiguration = {
        acceptedOutputModes: ['text'],
        historyLength: messageHistory.length,
        blocking: true,
      };

      // Создаем message объект с условным включением contextId
      const message: Message = {
        messageId: messageId,
        role: 'user',
        parts: [{ text: content, kind: 'text' }],
        kind: 'message',
        ...(contextId && { contextId: contextId }),
      };

      const sendParams: MessageSendParams = {
        message: message,
        configuration: configuration,
        metadata: {
          messageHistory: messageHistory,
          sessionInfo: {
            totalMessages: messages.length + 1,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        },
      };

      console.log('Отправляем сообщение (обычный режим) с историей:', {
        messageId,
        historyLength: messageHistory.length,
        isStreaming: false,
        contextId: contextId,
      });

      console.log('SendMessageParams:', JSON.stringify(sendParams, null, 2));

      const responseMessage = await client.sendMessage(sendParams);
      console.log('Message Result:', responseMessage);

      // Extract text from response message and collect parts/artifacts
      let agentResponse = '';
      let responseParts: Part[] = [];
      let responseArtifacts: Artifact[] = [];

      // Проверяем, что ответ может быть как Message, так и Task (некоторые серверы возвращают Task)
      if (responseMessage) {
        // Если это Task (имеет artifacts на верхнем уровне)
        if ('artifacts' in responseMessage && Array.isArray(responseMessage.artifacts)) {
          responseArtifacts = responseMessage.artifacts;
          // НЕ извлекаем текст из artifacts - он будет показан через ArtifactDisplay
          // agentResponse остаётся пустым
        }
        // Если это Message (имеет parts на верхнем уровне)
        else if ('parts' in responseMessage && Array.isArray(responseMessage.parts)) {
          responseParts = responseMessage.parts;
          const textParts = responseMessage.parts
            .filter((part: any) => part.kind === 'text')
            .map((part: any) => part.text)
            .join('');
          agentResponse = textParts || '';
        }
      }

      return { text: agentResponse, parts: responseParts, artifacts: responseArtifacts };
    },
    [agentUrl, messages, getMessageHistory]
  );

  // Стриминговая отправка сообщения (старая схема с TaskSendParams)
  const sendMessageStream = useCallback(
    async (content: string) => {
      const client = new A2AClient(agentUrl!, window.fetch.bind(window));
      const taskId = uuidv4();
      const messageId = uuidv4();

      // Получаем историю сообщений
      const messageHistory = getMessageHistory(messages);

      // Создаем message объект с условным включением contextId
      const streamMessage: Message = {
        messageId: messageId,
        role: 'user',
        parts: [{ text: content, kind: 'text' }],
        kind: 'message',
        ...(contextId && { contextId: contextId }),
      };

      const sendParams: TaskSendParams = {
        id: taskId,
        message: streamMessage,
        metadata: {
          messageHistory: messageHistory,
          historyCount: messageHistory.length,
          sessionInfo: {
            totalMessages: messages.length + 1,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        },
      };

      console.log('Отправляем задачу (стриминг режим) с историей:', {
        taskId,
        messageId,
        historyCount: messageHistory.length,
        isStreaming: true,
        contextId: contextId,
      });

      console.log('TaskSendParams:', JSON.stringify(sendParams, null, 2));

      const agentResponse = '';
      let agentMessageId: number | null = null;
      const accumulatedArtifacts: Artifact[] = [];
      const accumulatedParts: Part[] = [];

      try {
        // Создаем временное сообщение агента для стриминга
        setMessages(prev => {
          const agentMessage: ChatMessage = {
            id: prev.length + 1,
            sender: 'agent',
            content: '', // Начинаем с пустого контента
            senderName: 'Assistant',
            timestamp: new Date(),
            artifacts: [],
            parts: [],
          };
          agentMessageId = agentMessage.id;
          return [...prev, agentMessage];
        });

        // Обрабатываем стрим
        for await (const event of client.sendTaskSubscribe(sendParams)) {
          console.log('Streaming event:', event);

          if (event && typeof event === 'object') {
            let statusText = '';

            // Обработка TaskStatusUpdateEvent - показываем как inline статус
            if ('status' in event && event.status) {
              const status = event.status as any;
              if (status.message && status.message.parts) {
                const textParts = status.message.parts
                  .filter((part: any) => part.kind === 'text')
                  .map((part: any) => part.text)
                  .join('');

                if (textParts) {
                  // Сохраняем как statusText для inline отображения
                  statusText = textParts;
                }
              }

              // Обновляем statusText в сообщении
              if (agentMessageId && statusText) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === agentMessageId ? { ...msg, statusText: statusText } : msg
                  )
                );
              }
            }

            // Обработка TaskArtifactUpdateEvent (kind: "artifact-update")
            if ('artifact' in event && event.artifact) {
              const artifact = event.artifact as any;
              // append находится на уровне event, не внутри artifact!
              const isAppend = (event as any).append === true;
              const isLastChunk = (event as any).lastChunk === true;

              console.log('Artifact event:', {
                artifactId: artifact.artifactId,
                isAppend,
                isLastChunk,
                partsCount: artifact.parts?.length,
                firstPartText: artifact.parts?.[0]?.text?.substring(0, 50),
              });

              // Находим существующий artifact по ID
              const existingIndex = accumulatedArtifacts.findIndex(
                a => a.artifactId === artifact.artifactId
              );

              if (existingIndex >= 0 && isAppend && artifact.parts) {
                // Artifact уже существует И append: true - добавляем текст
                const existingArtifact = accumulatedArtifacts[existingIndex];
                const existingParts: Part[] = [...(existingArtifact.parts || [])];

                // Для каждой новой text part добавляем текст к последней существующей text part
                for (const newPart of artifact.parts) {
                  if (newPart.kind === 'text') {
                    const lastTextPartIndex = existingParts.findLastIndex(p => p.kind === 'text');

                    if (lastTextPartIndex >= 0) {
                      // Добавляем текст к последней text part
                      const existingTextPart = existingParts[lastTextPartIndex] as TextPart;
                      existingParts[lastTextPartIndex] = {
                        ...existingTextPart,
                        text: existingTextPart.text + newPart.text,
                      };
                    } else {
                      // Нет существующих text parts - добавляем новую
                      existingParts.push({ ...newPart });
                    }
                  } else {
                    // Для нетекстовых parts просто добавляем
                    existingParts.push({ ...newPart });
                  }
                }

                accumulatedArtifacts[existingIndex] = {
                  ...existingArtifact,
                  parts: existingParts,
                };
              } else if (existingIndex >= 0 && !isAppend) {
                // Artifact существует, но append: false - заменяем целиком
                accumulatedArtifacts[existingIndex] = {
                  ...artifact,
                  parts: artifact.parts?.map((p: Part) => ({ ...p })) || [],
                };
              } else {
                // Новый artifact - добавляем (первый чанк с append: false)
                accumulatedArtifacts.push({
                  ...artifact,
                  parts: artifact.parts?.map((p: Part) => ({ ...p })) || [],
                });
              }

              console.log(
                'Accumulated text:',
                (accumulatedArtifacts[0]?.parts?.[0] as TextPart)?.text
              );

              // Обновляем сообщение с новыми artifacts и убираем statusText
              if (agentMessageId) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === agentMessageId
                      ? {
                          ...msg,
                          content: '',
                          artifacts: accumulatedArtifacts.map(a => ({
                            ...a,
                            parts: a.parts?.map((p: any) => ({ ...p })) || [],
                          })),
                          statusText: undefined,
                        }
                      : msg
                  )
                );
              }
            }

            // Проверяем завершение
            if ('final' in event && event.final) {
              console.log('Streaming completed');
              // Завершаем анимацию и показываем artifacts (без дублирования текста в content)
              if (agentMessageId) {
                stopTyping();
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === agentMessageId
                      ? {
                          ...msg,
                          content: '', // Текст показывается через ArtifactDisplay
                          artifacts:
                            accumulatedArtifacts.length > 0 ? accumulatedArtifacts : undefined,
                          parts: accumulatedParts.length > 0 ? accumulatedParts : undefined,
                          statusText: undefined, // Убираем statusText при завершении
                        }
                      : msg
                  )
                );
              }
              break;
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        // Останавливаем анимацию и показываем ошибку
        stopTyping();
        if (agentMessageId) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === agentMessageId
                ? {
                    ...msg,
                    content: `Streaming error: ${error instanceof Error ? error.message : String(error)}`,
                  }
                : msg
            )
          );
        }
      }

      return '';
    },
    [agentUrl, messages, getMessageHistory, stopTyping]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !agentUrl) return;

      // Останавливаем любую текущую анимацию печатания
      stopTyping();

      const userMessage: ChatMessage = {
        id: messages.length + 1,
        sender: 'user',
        content,
        senderName: 'You',
        timestamp: new Date(),
      };

      // Добавляем сообщение пользователя к истории
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        if (isStreamingEnabled) {
          await sendMessageStream(content);
        } else {
          const syncResponse = await sendMessageSync(content);

          setMessages(prev => {
            const agentMessage: ChatMessage = {
              id: prev.length + 1,
              sender: 'agent',
              content: syncResponse.text,
              senderName: 'Assistant',
              timestamp: new Date(),
              artifacts: syncResponse.artifacts.length > 0 ? syncResponse.artifacts : undefined,
              parts: syncResponse.parts.length > 0 ? syncResponse.parts : undefined,
            };
            return [...prev, agentMessage];
          });
        }
      } catch (error) {
        console.error('A2A Client Error:', error);
        stopTyping();
        setMessages(prev => {
          const errorMessage: ChatMessage = {
            id: prev.length + 1,
            sender: 'agent',
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            senderName: 'Assistant',
            timestamp: new Date(),
          };
          return [...prev, errorMessage];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      agentUrl,
      messages,
      isStreamingEnabled,
      sendMessageSync,
      sendMessageStream,
      stopTyping,
    ]
  );

  return {
    messages,
    isLoading,
    messagesEndRef,
    scrollToBottom,
    sendMessage,
    setMessages,
  };
};
