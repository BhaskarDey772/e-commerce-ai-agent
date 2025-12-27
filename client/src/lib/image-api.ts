import axios, { type AxiosInstance, type CancelTokenSource } from "axios";
import { config } from "./config";

class ImageAPI {
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

  getProxiedImageUrl(url: string | null | undefined, productId?: string | null): string {
    if (!url) return "";
    if (url.includes("/api/images/proxy")) {
      return url;
    }
    if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    const encodedUrl = encodeURIComponent(url);
    const productParam = productId ? `&productId=${productId}` : "";
    return `${config.apiBaseUrl}/api/images/proxy?url=${encodedUrl}${productParam}`;
  }

  async getImage(url: string, productId?: string | null): Promise<Blob> {
    const proxiedUrl = this.getProxiedImageUrl(url, productId);
    const requestKey = `image-${proxiedUrl}`;
    const cancelToken = this.createCancelToken(requestKey);

    try {
      const response = await this.axiosInstance.get<Blob>(proxiedUrl, {
        responseType: "blob",
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

export const imageAPI = new ImageAPI();
