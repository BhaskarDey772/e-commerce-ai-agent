import axios, { type AxiosInstance, type CancelTokenSource } from "axios";
import type { Product, ProductsResponse } from "@/types";
import { config } from "./config";

class ProductsAPI {
  private axiosInstance: AxiosInstance;
  private cancelTokenSources: Map<string, CancelTokenSource> = new Map();

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private cancelPreviousRequest(requestKey: string) {
    const existingSource = this.cancelTokenSources.get(requestKey);
    if (existingSource) {
      existingSource.cancel("Request cancelled due to new request");
      this.cancelTokenSources.delete(requestKey);
    }
  }

  private createCancelToken(requestKey: string) {
    this.cancelPreviousRequest(requestKey);
    const source = axios.CancelToken.source();
    this.cancelTokenSources.set(requestKey, source);
    return source.token;
  }

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
    const requestKey = `products-${JSON.stringify(params)}`;
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.get<ProductsResponse>("/products", {
        params,
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

  async getProductById(productId: string): Promise<{ success: boolean; data: Product }> {
    const requestKey = `product-${productId}`;
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: Product }>(
        `/products/${productId}`,
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

  async getCategories(): Promise<{ success: boolean; data: { categories: string[] } }> {
    const requestKey = "categories";
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.get<{
        success: boolean;
        data: { categories: string[] };
      }>("/products/categories/list", {
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

  async getBrands(): Promise<{ success: boolean; data: { brands: string[] } }> {
    const requestKey = "brands";
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.get<{
        success: boolean;
        data: { brands: string[] };
      }>("/products/brands/list", {
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

export const productsAPI = new ProductsAPI();
