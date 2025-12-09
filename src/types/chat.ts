import { Artifact, Part } from '@/a2a/schema';

export interface ChatMessage {
  id: number;
  sender: 'agent' | 'user';
  content: string;
  senderName: string;
  timestamp: Date;
  artifacts?: Artifact[];
  parts?: Part[];
  statusText?: string; // Для inline отображения status-update
}

export type TabType = 'chat' | 'chats' | 'agents' | 'events' | 'tasks' | 'settings';
