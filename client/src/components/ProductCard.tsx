import { Star, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Product, ProductCardProps } from "@/types";
import { getProxiedImageUrl } from "@/lib/utils";

export function ProductCard({ product, onClick, index = 0 }: ProductCardProps) {
  const discount =
    product.originalPrice && product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <Card
      className="group product-card glass-card overflow-hidden cursor-pointer border-border/50 hover:border-primary/30"
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
          {product.image ? (
            <img
              src={getProxiedImageUrl(product.image, product.id)}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://via.placeholder.com/300?text=No+Image";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}

          {/* Discount Badge */}
          {discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-success text-success-foreground border-0">
              <TrendingDown className="w-3 h-3 mr-1" />
              {discount}% off
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div>
            {/* Brand & Category */}
            <div className="flex items-center gap-2 mb-1">
              {product.brand && (
                <span className="text-xs font-medium text-primary">{product.brand}</span>
              )}
              {product.category && (
                <span className="text-xs text-muted-foreground">• {product.category}</span>
              )}
            </div>

            {/* Name */}
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          {/* Price & Rating */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-baseline gap-2">
              {product.price ? (
                <>
                  <span className="text-xl font-bold text-foreground">
                    ₹{product.price.toLocaleString()}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      ₹{product.originalPrice.toLocaleString()}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Price unavailable</span>
              )}
            </div>

            {product.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{product.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
