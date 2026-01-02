import axios, { type AxiosInstance } from "axios";
import type {
  ChatResponse,
  Conversation,
  Message,
  NewConversationResponse,
  Product,
  ProductsResponse,
} from "@/types";
import { config } from "./config";

class API {
  private axiosInstance: AxiosInstance;

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

  // Products API
  async getProducts(params: {
    page?: number;
    limit?: number;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
    search?: string;
    sortBy?: string;
  }): Promise<ProductsResponse> {
    const response = await this.axiosInstance.get<ProductsResponse>("/products", {
      params,
    });
    return response.data;
  }

  async getProductById(productId: string): Promise<{ success: boolean; data: Product }> {
    const response = await this.axiosInstance.get<{ success: boolean; data: Product }>(
      `/products/${productId}`,
    );
    return response.data;
  }

  async getCategories(): Promise<{ success: boolean; data: { categories: string[] } }> {
    const response = await this.axiosInstance.get<{
      success: boolean;
      data: { categories: string[] };
    }>("/products/categories/list");
    return response.data;
  }

  async getBrands(): Promise<{ success: boolean; data: { brands: string[] } }> {
    const response = await this.axiosInstance.get<{
      success: boolean;
      data: { brands: string[] };
    }>("/products/brands/list");
    return response.data;
  }

  // Chat API
  async getConversations(): Promise<{
    success: boolean;
    data: {
      conversations: Conversation[];
    };
  }> {
    const response = await this.axiosInstance.get<{
      success: boolean;
      data: {
        conversations: Conversation[];
      };
    }>("/chat/conversations");
    return response.data;
  }

  async getConversationById(conversationId: string): Promise<{
    success: boolean;
    data: {
      conversationId: string;
      sessionId: string | null;
      messages: Message[];
    };
  }> {
    const response = await this.axiosInstance.get<{
      success: boolean;
      data: {
        conversationId: string;
        sessionId: string | null;
        messages: Message[];
      };
    }>(`/chat/conversation/${conversationId}`);
    return response.data;
  }

  async createNewConversation(): Promise<NewConversationResponse> {
    const response = await this.axiosInstance.post<NewConversationResponse>(
      "/chat/conversation/new",
      {},
    );
    return response.data;
  }

  async sendMessage(params: {
    conversationId?: string | null;
    message: string;
  }): Promise<ChatResponse> {
    const response = await this.axiosInstance.post<ChatResponse>("/chat/message", params);
    return response.data;
  }

  private static readonly FLIPKART_CDN = "https://rukminim2.flixcart.com";

  getImageUrl(url: string | null | undefined): string {
    if (!url) return "";
    if (url.startsWith("/image/")) {
      return `${API.FLIPKART_CDN}${url}`;
    }
    return url;
  }
}

export const api = new API();
