import { AlertCircle, ExternalLink, Package, Shield, Star } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";

interface ProductResponse {
  type: "product_response";
  summary: string;
  products: Array<{
    id: string | number;
    name: string;
    price: number;
    brand: string | null;
    category: string;
    rating: number | null;
    productUrl?: string | null;
  }>;
  message: string;
}

interface PolicyResponse {
  type: "policy_response";
  answer: string;
  message: string;
}

interface RefusalResponse {
  type: "refusal";
  reason: string;
  message: string;
}

type StructuredResponse = ProductResponse | PolicyResponse | RefusalResponse;

interface StructuredResponseProps {
  response: StructuredResponse;
}

export function StructuredResponse({ response }: StructuredResponseProps) {
  if (response.type === "product_response") {
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-start gap-2">
          <Package className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary mb-1">{response.summary}</p>
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
                {response.message}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {response.products && response.products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {response.products.map((product, idx) => (
              <div
                key={`${product.id}-${idx}`}
                className="glass-card rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm line-clamp-2 flex-1">{product.name}</h4>
                    {product.rating !== null &&
                      product.rating !== undefined &&
                      typeof product.rating === "number" && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{product.rating.toFixed(1)}</span>
                        </div>
                      )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {product.brand && (
                      <Badge variant="secondary" className="text-xs">
                        {product.brand}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-lg font-bold text-primary">
                      ₹{product.price.toLocaleString()}
                    </span>
                    {product.productUrl ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs cursor-pointer"
                        onClick={() => {
                          window.open(product.productUrl!, "_blank");
                        }}
                      >
                        View
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs cursor-pointer"
                        onClick={async () => {
                          // Fallback: fetch product details if URL not available
                          try {
                            const res = await fetch(`${config.apiBaseUrl}/products/${product.id}`);
                            const data = await res.json();
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
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (response.type === "policy_response") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-primary">Policy Information</p>
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
                {response.message || response.answer}
              </ReactMarkdown>
            </div>
            {response.answer && response.message && response.answer !== response.message && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  View detailed information
                </summary>
                <div className="mt-2 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
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
                    {response.answer}
                  </ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (response.type === "refusal") {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
              Unable to Process Request
            </p>
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
                {response.message || response.reason}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown types
  return <div className="text-sm text-muted-foreground">{JSON.stringify(response, null, 2)}</div>;
}

interface ParsedMessageProps {
  content: string;
}

export function ParsedMessage({ content }: ParsedMessageProps) {
  // Try to parse as JSON
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Not JSON, render as plain text
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  // Check if it's a structured response
  if (
    parsed &&
    typeof parsed === "object" &&
    parsed !== null &&
    "type" in parsed &&
    typeof parsed.type === "string" &&
    ["product_response", "policy_response", "refusal"].includes(parsed.type)
  ) {
    return <StructuredResponse response={parsed as StructuredResponse} />;
  }

  // Render as plain text if not a structured response
  return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
}
