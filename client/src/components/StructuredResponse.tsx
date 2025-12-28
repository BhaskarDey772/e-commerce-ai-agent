import axios from "axios";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Package,
  Shield,
  Star,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type {
  NewResponseFormat,
  ParsedMessageProps,
  PolicyResponse,
  ProductListProps,
  ProductResponse,
  RefusalResponse,
  StructuredResponse,
  StructuredResponseProps,
} from "@/types";

function ProductList({ products }: ProductListProps) {
  const INITIAL_PRODUCTS_TO_SHOW = 3;
  const [showAll, setShowAll] = useState(false);
  const displayedProducts = showAll ? products : products.slice(0, INITIAL_PRODUCTS_TO_SHOW);
  const hasMore = products.length > INITIAL_PRODUCTS_TO_SHOW;

  return (
    <div className="space-y-2 mt-3">
      {displayedProducts.map((product, idx) => (
        <div
          key={`${product.id}-${idx}`}
          className="glass-card rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold text-xs line-clamp-2 flex-1">{product.name}</h4>
                {product.rating !== null &&
                  product.rating !== undefined &&
                  typeof product.rating === "number" && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px]">{product.rating.toFixed(1)}</span>
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                {product.brand && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {product.brand}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {product.category}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                <span className="text-sm font-bold text-primary">
                  ₹{product.price.toLocaleString()}
                </span>
                {product.productUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 cursor-pointer"
                    onClick={() => {
                      window.open(product.productUrl!, "_blank");
                    }}
                  >
                    View
                    <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 cursor-pointer"
                    onClick={async () => {
                      try {
                        const data = await api.getProductById(String(product.id));
                        if (data.success && data.data.productUrl) {
                          window.open(data.data.productUrl, "_blank");
                        } else {
                          alert(
                            `Product: ${product.name}\nPrice: ₹${product.price.toLocaleString()}`,
                          );
                        }
                      } catch (error) {
                        console.error("Error fetching product:", error);
                      }
                    }}
                  >
                    View
                    <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Show More/Less Button */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Show {products.length - INITIAL_PRODUCTS_TO_SHOW} more
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export function ParsedMessage({ content }: ParsedMessageProps) {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "message" in parsed &&
    typeof (parsed as { message: unknown }).message === "string"
  ) {
    const response = parsed as NewResponseFormat;
    const message = response.message || "";
    const products = response.data?.products || [];

    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => <li className="ml-2">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-secondary p-2 rounded text-xs overflow-x-auto mb-2">
                      {children}
                    </pre>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {Array.isArray(products) && products.length > 0 && <ProductList products={products} />}
      </div>
    );
  }

  return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
}
