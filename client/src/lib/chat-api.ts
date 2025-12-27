import axios, { type AxiosInstance, type CancelTokenSource } from "axios";
import type { ChatResponse, Conversation, Message, NewConversationResponse } from "@/types";
import { config } from "./config";

class ChatAPI {
  private axiosInstance: AxiosInstance;
  private cancelTokenSources: Map<string, CancelTokenSource> = new Map();

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });
  }

  private cancelPreviousRequest(requestKey: string) {
    const existingSource = this.cancelTokenSources.get(requestKey);
    if (existingSource) {
      existingSource.cancel("Request cancelled due to new request");
      this.cancelTokenSources.delete(requestKey);
    }
  }

  private createCancelToken(requestKey: string, cancelPrevious: boolean = true) {
    if (cancelPrevious) {
      this.cancelPreviousRequest(requestKey);
    }
    const source = axios.CancelToken.source();
    this.cancelTokenSources.set(requestKey, source);
    return source.token;
  }

  async getConversations(): Promise<{
    success: boolean;
    data: {
      conversations: Conversation[];
    };
  }> {
    const requestKey = "conversations";
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.get<{
        success: boolean;
        data: {
          conversations: Conversation[];
        };
      }>("/chat/conversations", {
        cancelToken,
      });
      this.cancelTokenSources.delete(requestKey);
      return response.data;
    } catch (error) {
      this.cancelTokenSources.delete(requestKey);
      if (axios.isCancel(error)) {
        throw new Error("Request cancelled");
      }
      throw error;
    }
  }

  async getConversationById(conversationId: string): Promise<{
    success: boolean;
    data: {
      conversationId: string;
      sessionId: string | null;
      messages: Message[];
    };
  }> {
    const requestKey = `conversation-${conversationId}`;

    const cancelToken = this.createCancelToken(requestKey, false);

    try {
      console.log(`Fetching conversation: ${conversationId}`);
      const response = await this.axiosInstance.get<{
        success: boolean;
        data: {
          conversationId: string;
          sessionId: string | null;
          messages: Message[];
        };
      }>(`/chat/conversation/${conversationId}`, {
        cancelToken,
      });
      console.log("Conversation API response:", response.data);
      this.cancelTokenSources.delete(requestKey);
      return response.data;
    } catch (error) {
      this.cancelTokenSources.delete(requestKey);
      if (axios.isCancel(error)) {
        console.log("Conversation request cancelled");
        throw new Error("Request cancelled");
      }
      console.error("Conversation API error:", error);
      throw error;
    }
  }

  async createNewConversation(): Promise<NewConversationResponse> {
    const requestKey = "new-conversation";
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.post<NewConversationResponse>(
        "/chat/conversation/new",
        {},
        {
          cancelToken,
        },
      );
      this.cancelTokenSources.delete(requestKey);
      return response.data;
    } catch (error) {
      this.cancelTokenSources.delete(requestKey);
      if (axios.isCancel(error)) {
        throw new Error("Request cancelled");
      }
      throw error;
    }
  }

  async sendMessage(params: {
    conversationId?: string | null;
    message: string;
  }): Promise<ChatResponse> {
    const requestKey = `message-${params.conversationId || "new"}`;
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.post<ChatResponse>("/chat/message", params, {
        cancelToken,
      });
      this.cancelTokenSources.delete(requestKey);
      return response.data;
    } catch (error) {
      this.cancelTokenSources.delete(requestKey);
      if (axios.isCancel(error)) {
        throw new Error("Request cancelled");
      }
      throw error;
    }
  }

  cancelAllRequests() {
    this.cancelTokenSources.forEach((source) => {
      source.cancel("All requests cancelled");
    });
    this.cancelTokenSources.clear();
  }

  cancelRequest(requestKey: string) {
    this.cancelPreviousRequest(requestKey);
  }
}

export const chatAPI = new ChatAPI();
