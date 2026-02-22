'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  image_url?: string;
  isImageLoading?: boolean;
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Store messages per conversation
interface ConversationMessages {
  [conversationId: string]: Message[];
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messagesByConversation: ConversationMessages;
  currentMessages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isGuest: boolean;
  useSupabase: boolean; // Track if Supabase is actually available
  
  // Actions
  init: (isGuest: boolean) => Promise<void>;
  loadConversations: () => Promise<void>;
  createConversation: () => Promise<string>;
  setCurrentConversation: (id: string | null) => Promise<void>;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'createdAt'>) => Promise<string>;
  updateMessage: (conversationId: string, messageId: string, content: string) => Promise<void>;
  updateMessageWithImage: (conversationId: string, messageId: string, imageUrl: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setStreaming: (streaming: boolean) => void;
  getCurrentConversation: () => Conversation | undefined;
  clearGuestData: () => void;
}

// Generate UUID
const generateId = () => crypto.randomUUID();

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      messagesByConversation: {},
      currentMessages: [],
      isStreaming: false,
      isLoading: false,
      isInitialized: false,
      isGuest: true,
      useSupabase: false,

      init: async (isGuest) => {
        set({ isGuest, isInitialized: true, isLoading: true });
        
        if (!isGuest) {
          // Try to load conversations from Supabase for authenticated users
          try {
            const response = await fetch('/api/conversations');
            if (response.ok) {
              set({ useSupabase: true });
              await get().loadConversations();
            } else {
              // Not actually authenticated, fall back to local mode
              console.log('Supabase not available, using local storage');
              set({ 
                useSupabase: false,
                isGuest: true,
                conversations: [],
                currentMessages: [],
                currentConversationId: null,
                messagesByConversation: {},
                isLoading: false,
              });
            }
          } catch (error) {
            console.error('Failed to connect to Supabase:', error);
            set({ 
              useSupabase: false,
              isGuest: true,
              conversations: [],
              currentMessages: [],
              currentConversationId: null,
              messagesByConversation: {},
              isLoading: false,
            });
          }
        } else {
          // For guests, start fresh
          set({ 
            useSupabase: false,
            conversations: [],
            currentMessages: [],
            currentConversationId: null,
            messagesByConversation: {},
            isLoading: false,
          });
        }
      },

      loadConversations: async () => {
        if (!get().useSupabase) return;
        
        try {
          const response = await fetch('/api/conversations');
          
          if (response.status === 401) {
            // Not authenticated, switch to guest mode
            set({ 
              useSupabase: false,
              isGuest: true,
              isLoading: false,
            });
            return;
          }
          
          const data = await response.json();
          
          if (data.success && data.conversations) {
            set({ 
              conversations: data.conversations,
              isLoading: false,
            });
            
            // If there are conversations, select the most recent one
            if (data.conversations.length > 0) {
              await get().setCurrentConversation(data.conversations[0].id);
            } else {
              set({ isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to load conversations:', error);
          set({ isLoading: false });
        }
      },

      createConversation: async () => {
        const state = get();
        
        // For authenticated users with Supabase available, create in Supabase
        if (!state.isGuest && state.useSupabase) {
          try {
            const response = await fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: null }),
            });
            
            if (response.status === 401) {
              // Not authenticated, switch to guest mode and create locally
              set({ useSupabase: false, isGuest: true });
            } else {
              const data = await response.json();
              
              if (data.success && data.conversation) {
                const newConversation = data.conversation;
                set((state) => ({
                  conversations: [newConversation, ...state.conversations],
                  currentConversationId: newConversation.id,
                  currentMessages: [],
                  messagesByConversation: {
                    ...state.messagesByConversation,
                    [newConversation.id]: [],
                  },
                }));
                return newConversation.id;
              }
            }
          } catch (error) {
            console.error('Failed to create conversation in Supabase:', error);
            // Fall through to local creation
          }
        }
        
        // Local storage fallback (guest mode or Supabase failure)
        const id = generateId();
        const now = new Date().toISOString();
        const conversation: Conversation = {
          id,
          title: null,
          created_at: now,
          updated_at: now,
        };
        
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: id,
          currentMessages: [],
          messagesByConversation: {
            ...state.messagesByConversation,
            [id]: [],
          },
        }));
        
        return id;
      },

      setCurrentConversation: async (id) => {
        if (id === null) {
          set({ currentConversationId: null, currentMessages: [] });
          return;
        }
        
        const state = get();
        set({ currentConversationId: id, isLoading: true });
        
        // Check if we already have messages cached
        if (state.messagesByConversation[id]) {
          set({ 
            currentMessages: state.messagesByConversation[id],
            isLoading: false,
          });
          return;
        }
        
        // For authenticated users with Supabase available, fetch from Supabase
        if (!state.isGuest && state.useSupabase) {
          try {
            const response = await fetch(`/api/conversations/${id}/messages`);
            
            if (response.status === 401) {
              // Not authenticated, switch to guest mode
              set({ 
                useSupabase: false, 
                isGuest: true,
                currentMessages: [],
                isLoading: false,
              });
              return;
            }
            
            const data = await response.json();
            
            if (data.success && data.messages) {
              const messages: Message[] = data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.created_at,
                image_url: m.image_url,
              }));
              
              set((state) => ({
                currentMessages: messages,
                messagesByConversation: {
                  ...state.messagesByConversation,
                  [id]: messages,
                },
                isLoading: false,
              }));
              return;
            }
          } catch (error) {
            console.error('Failed to fetch messages from Supabase:', error);
          }
        }
        
        // Fallback
        set({ 
          currentMessages: state.messagesByConversation[id] || [],
          isLoading: false,
        });
      },

      addMessage: async (conversationId, message) => {
        const state = get();
        const id = generateId();
        const now = new Date().toISOString();
        const newMessage: Message = {
          id,
          role: message.role,
          content: message.content,
          createdAt: now,
          image_url: message.imageBase64 ? `data:image/png;base64,${message.imageBase64}` : undefined,
          isImageLoading: message.isImageLoading,
        };

        // For authenticated users with Supabase available, save to Supabase
        if (!state.isGuest && state.useSupabase && !message.isImageLoading) {
          try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: message.role,
                content: message.content,
                image_url: newMessage.image_url || null,
              }),
            });
            
            if (response.status === 401) {
              // Not authenticated, switch to guest mode
              set({ useSupabase: false, isGuest: true });
            } else {
              const data = await response.json();
              
              if (data.success && data.message) {
                const savedMessage: Message = {
                  id: data.message.id,
                  role: data.message.role,
                  content: data.message.content,
                  createdAt: data.message.created_at,
                  image_url: data.message.image_url,
                };
                
                // Update conversation title if first user message
                if (message.role === 'user') {
                  const messages = state.messagesByConversation[conversationId] || [];
                  if (messages.length === 0) {
                    const title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
                    set((state) => ({
                      conversations: state.conversations.map(c =>
                        c.id === conversationId ? { ...c, title } : c
                      ),
                    }));
                  }
                }
                
                set((state) => {
                  const updatedMessages = [...state.currentMessages, savedMessage];
                  return {
                    currentMessages: updatedMessages,
                    messagesByConversation: {
                      ...state.messagesByConversation,
                      [conversationId]: updatedMessages,
                    },
                  };
                });
                
                return savedMessage.id;
              }
            }
          } catch (error) {
            console.error('Failed to add message to Supabase:', error);
            // Fall through to local storage
          }
        }
        
        // Fallback: add message locally
        set((state) => {
          const updatedMessages = [...state.currentMessages, newMessage];
          return {
            currentMessages: updatedMessages,
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: updatedMessages,
            },
          };
        });
        
        // Update conversation title if first user message
        if (message.role === 'user') {
          const messages = state.messagesByConversation[conversationId] || [];
          if (messages.length === 0) {
            const title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
            set((state) => ({
              conversations: state.conversations.map(c =>
                c.id === conversationId ? { ...c, title } : c
              ),
            }));
          }
        }
        
        return id;
      },

      updateMessage: async (conversationId, messageId, content) => {
        const state = get();
        
        // For authenticated users with Supabase available, update in Supabase
        if (!state.isGuest && state.useSupabase) {
          try {
            const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content }),
            });
            
            if (response.status === 401) {
              set({ useSupabase: false, isGuest: true });
            }
          } catch (error) {
            console.error('Failed to update message in Supabase:', error);
          }
        }
        
        // Update locally
        set((state) => {
          const updatedMessages = state.currentMessages.map((m) =>
            m.id === messageId ? { ...m, content } : m
          );
          return {
            currentMessages: updatedMessages,
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: updatedMessages,
            },
          };
        });
      },

      updateMessageWithImage: async (conversationId, messageId, imageUrl) => {
        set((state) => {
          const updatedMessages = state.currentMessages.map((m) =>
            m.id === messageId ? { ...m, image_url: imageUrl, isImageLoading: false } : m
          );
          return {
            currentMessages: updatedMessages,
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: updatedMessages,
            },
          };
        });
      },

      deleteConversation: async (id) => {
        const state = get();
        
        // For authenticated users with Supabase available, delete from Supabase
        if (!state.isGuest && state.useSupabase) {
          try {
            const response = await fetch(`/api/conversations/${id}`, {
              method: 'DELETE',
            });
            
            if (response.status === 401) {
              set({ useSupabase: false, isGuest: true });
            }
          } catch (error) {
            console.error('Failed to delete conversation from Supabase:', error);
          }
        }
        
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          const newMessagesByConversation = { ...state.messagesByConversation };
          delete newMessagesByConversation[id];
          
          const newCurrentId = state.currentConversationId === id
            ? newConversations[0]?.id ?? null
            : state.currentConversationId;
          
          return {
            conversations: newConversations,
            currentConversationId: newCurrentId,
            currentMessages: newCurrentId ? (newMessagesByConversation[newCurrentId] || []) : [],
            messagesByConversation: newMessagesByConversation,
          };
        });
      },

      setStreaming: (streaming) => {
        set({ isStreaming: streaming });
      },

      getCurrentConversation: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.currentConversationId);
      },

      clearGuestData: () => {
        set({
          conversations: [],
          currentConversationId: null,
          currentMessages: [],
          messagesByConversation: {},
        });
      },
    }),
    {
      name: 'vynthen-chat-storage',
      partialize: (state) => {
        // Only persist for guest mode (Supabase handles authenticated users)
        if (!state.isGuest) {
          return {
            isGuest: state.isGuest,
            useSupabase: state.useSupabase,
          };
        }
        return {
          isGuest: state.isGuest,
          useSupabase: state.useSupabase,
          conversations: state.conversations,
          currentConversationId: state.currentConversationId,
          messagesByConversation: state.messagesByConversation,
          currentMessages: state.currentMessages,
        };
      },
    }
  )
);
